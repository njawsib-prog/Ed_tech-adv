import { Response } from 'express';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

// HMAC Secret for payment receipt signatures
const PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || 'default-secret-change-in-production';

/**
 * Generate a unique, cryptographically secure receipt number.
 * Format: UUID + first 16 chars of SHA256(uuid + studentId + timestamp)
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
      .select('*, students(name, email)')
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
    const txId = (transaction_id as string | undefined) || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const receiptSignature = generateReceiptSignature(student_id as string, parsedAmount, txId, timestamp);
    const receiptNumber = generateReceiptNumber(student_id as string, timestamp);

    // Insert payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id,
        branch_id,
        amount: parsedAmount,
        status: (status as string) || 'pending',
        payment_method,
        transaction_id: txId,
        description,
        receipt_signature: receiptSignature,
        created_at: timestamp,
      })
      .select()
      .single();

    if (paymentError) {
      res.status(400).json({ error: paymentError.message });
      return;
    }

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .insert({
        receipt_number: receiptNumber,
        student_id,
        course_id: course_id || null,
        payment_id: payment.id,
        amount: parsedAmount,
        payment_method,
        issued_by: req.user?.id || null,
        signature_hash: receiptSignature,
        issued_at: timestamp,
        notes: description || null,
      })
      .select()
      .single();

    // Non-fatal if receipts table doesn't exist yet
    if (receiptError) {
      console.warn('[RecordPayment] Could not create receipt record:', receiptError.message);
    }

    res.status(201).json({
      data: payment,
      receipt: {
        receipt_number: receiptNumber,
        signature: receiptSignature,
        timestamp,
        receipt_id: receipt?.id || null,
        verificationUrl: `/api/payments/${payment.id}/verify`,
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

    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status as string)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

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

/**
 * Get receipt by payment ID
 */
export const getPaymentReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: receipt, error } = await supabaseAdmin
      .from('receipts')
      .select('*, students(name, email), courses(name, title), admins(name)')
      .eq('payment_id', id)
      .single();

    if (error || !receipt) {
      // Fall back to payment record itself
      const { data: payment, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('*, students(name, email)')
        .eq('id', id)
        .single();

      if (pErr || !payment) {
        res.status(404).json({ error: 'Receipt not found' });
        return;
      }

      res.json({
        data: {
          receipt_number: `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
          payment_id: payment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          issued_at: payment.created_at,
          student: payment.students,
          signature_hash: payment.receipt_signature,
        },
      });
      return;
    }

    res.json({ data: receipt });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: msg });
  }
};

/**
 * Verify payment receipt integrity
 */
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
      res.json({
        paymentId: id,
        verified: null,
        message: 'Payment record exists but has no cryptographic signature (legacy payment)',
        integrity: 'unknown',
      });
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
      paymentId: id,
      verified: isValid,
      message: isValid
        ? 'Payment receipt signature is valid'
        : 'Payment receipt signature is INVALID – potential tampering detected',
      integrity: isValid ? 'valid' : 'compromised',
      details: {
        studentId: payment.student_id,
        amount: payment.amount,
        transactionId: payment.transaction_id,
        timestamp: payment.created_at,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[VerifyPayment] Error:', error);
    res.status(500).json({ error: msg });
  }
};
