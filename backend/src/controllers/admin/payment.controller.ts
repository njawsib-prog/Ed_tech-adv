import { Response } from 'express';
import { createHmac, createHash, timingSafeEqual, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

// HMAC Secret for payment receipt signatures
const PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || 'default-secret-change-in-production';

/**
 * Generate a unique, cryptographically secure receipt number.
 */
function generateReceiptNumber(studentId: string, timestamp: string): string {
  const base = uuidv4();
  const hash = createHash('sha256')
    .update(`${base}:${studentId}:${timestamp}`)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();
  return `RCP-${hash}`;
}

/**
 * Generate a cryptographic HMAC-SHA256 signature for receipt integrity.
 */
export function generateReceiptSignature(
  studentId: string,
  amount: number,
  transactionId: string,
  timestamp: string
): string {
  const payload = `${studentId}:${amount}:${transactionId}:${timestamp}`;
  return createHmac('sha256', PAYMENT_HMAC_SECRET)
    .update(payload)
    .digest('hex');
}

/**
 * Constant-time signature verification to prevent timing attacks.
 */
export function verifyReceiptSignature(
  studentId: string,
  amount: number,
  transactionId: string,
  timestamp: string,
  signature: string
): boolean {
  const expected = generateReceiptSignature(studentId, amount, transactionId, timestamp);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { student_id, branch_id, status } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select('*, students:users!payments_student_id_fkey(id, name, email)')
      .order('created_at', { ascending: false });

    if (student_id) query = query.eq('student_id', student_id as string);
    if (branch_id) query = query.eq('branch_id', branch_id as string);
    if (status) query = query.eq('status', status as string);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      student_id,
      course_id,
      branch_id,
      amount,
      status,
      payment_method,
      transaction_id,
      description,
    } = req.body;

    if (!student_id || amount === undefined || !payment_method) {
      res.status(400).json({ error: 'Missing required fields: student_id, amount, payment_method' });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    const timestamp = new Date().toISOString();
    const txId = (transaction_id as string | undefined) || `TXN-${Date.now()}-${randomBytes(8).toString('hex')}`;
    const receiptSignature = generateReceiptSignature(student_id as string, parsedAmount, txId, timestamp);
    const receiptNumber = generateReceiptNumber(student_id as string, timestamp);

    // In the optimized schema, receipt fields are part of the payments table
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id,
        course_id: course_id || null,
        branch_id,
        amount: parsedAmount,
        status: (status as string) || 'pending',
        payment_method,
        transaction_id: txId,
        description,
        receipt_number: receiptNumber,
        receipt_signature: receiptSignature,
        issued_by: req.user?.id || null,
        created_at: timestamp,
      })
      .select()
      .single();

    if (paymentError) {
      res.status(400).json({ error: paymentError.message });
      return;
    }

    res.status(201).json({
      data: payment,
      receipt: {
        receipt_number: receiptNumber,
        signature: receiptSignature,
        timestamp,
        verificationUrl: `/api/admin/payments/${payment.id}/verify`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[RecordPayment] Error:', error);
    res.status(500).json({ error: msg });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
};

export const getPaymentReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*, students:users!payments_student_id_fkey(id, name, email), courses(name, title)')
      .eq('id', id)
      .single();

    if (error || !payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({ data: payment });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, student_id, amount, transaction_id, created_at, receipt_signature')
      .eq('id', id)
      .single();

    if (error || !payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (!payment.receipt_signature) {
      res.json({ verified: null, message: 'No cryptographic signature' });
      return;
    }

    const isValid = verifyReceiptSignature(
      payment.student_id,
      payment.amount,
      payment.transaction_id,
      payment.created_at,
      payment.receipt_signature
    );

    res.json({
      verified: isValid,
      message: isValid ? 'Valid' : 'Invalid',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
};
