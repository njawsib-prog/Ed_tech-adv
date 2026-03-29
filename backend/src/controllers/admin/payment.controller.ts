import { Response } from 'express';
import { createHmac } from 'crypto';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

// HMAC Secret for payment receipt signatures
const PAYMENT_HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET || 'default-secret-change-in-production';

/**
 * Generate a cryptographic signature for payment integrity verification
 * Uses HMAC-SHA256 to create a tamper-evident receipt
 * 
 * @param studentId - Student UUID
 * @param amount - Payment amount
 * @param transactionId - Transaction identifier
 * @param timestamp - ISO timestamp for the payment
 * @returns Hex-encoded HMAC-SHA256 signature
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
 * Verify payment receipt signature
 * 
 * @param studentId - Student UUID
 * @param amount - Payment amount
 * @param transactionId - Transaction identifier
 * @param timestamp - ISO timestamp for the payment
 * @param signature - Signature to verify
 * @returns Boolean indicating if signature is valid
 */
export function verifyReceiptSignature(
  studentId: string,
  amount: number,
  transactionId: string,
  timestamp: string,
  signature: string
): boolean {
  const expectedSignature = generateReceiptSignature(studentId, amount, transactionId, timestamp);
  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== signature.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { student_id, branch_id, status } = req.query;
    
    let query = supabaseAdmin.from('payments').select('*, students(name, email)');

    if (student_id) query = query.eq('student_id', student_id);
    if (branch_id) query = query.eq('branch_id', branch_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const recordPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { student_id, branch_id, amount, status, payment_method, transaction_id, description } = req.body;

    // Validate required fields
    if (!student_id || amount === undefined || !payment_method) {
      res.status(400).json({ error: 'Missing required fields: student_id, amount, payment_method' });
      return;
    }

    // Validate amount is a positive number
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    // Generate timestamp and signature for cryptographic receipt
    const timestamp = new Date().toISOString();
    const txId = transaction_id || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate HMAC-SHA256 signature for integrity verification
    const receiptSignature = generateReceiptSignature(student_id, parsedAmount, txId, timestamp);

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id,
        branch_id,
        amount: parsedAmount,
        status: status || 'pending',
        payment_method,
        transaction_id: txId,
        description,
        receipt_signature: receiptSignature,
        created_at: timestamp,
      })
      .select()
      .single();

    if (error) {
      console.error('[RecordPayment] Database error:', error);
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ 
      data,
      receipt: {
        signature: receiptSignature,
        timestamp,
        verificationUrl: `/api/payments/${data.id}/verify`
      }
    });
  } catch (error: any) {
    console.error('[RecordPayment] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled'];
    if (!validStatuses.includes(status)) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify payment receipt integrity
 * This endpoint allows clients to verify that a payment record has not been tampered with
 */
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch the payment record
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, student_id, amount, transaction_id, created_at, receipt_signature')
      .eq('id', id)
      .single();

    if (error || !payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Check if payment has a signature (older payments may not have one)
    if (!payment.receipt_signature) {
      res.json({
        paymentId: id,
        verified: null,
        message: 'Payment record exists but has no cryptographic signature (legacy payment)',
        integrity: 'unknown'
      });
      return;
    }

    // Verify the signature
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
      message: isValid ? 'Payment receipt signature is valid' : 'Payment receipt signature is INVALID - potential tampering detected',
      integrity: isValid ? 'valid' : 'compromised',
      details: {
        studentId: payment.student_id,
        amount: payment.amount,
        transactionId: payment.transaction_id,
        timestamp: payment.created_at
      }
    });
  } catch (error: any) {
    console.error('[VerifyPayment] Error:', error);
    res.status(500).json({ error: error.message });
  }
};
