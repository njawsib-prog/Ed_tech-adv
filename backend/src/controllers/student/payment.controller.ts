import { Response } from 'express';
import { AuthRequest } from '../../types';
import { supabaseAdmin } from '../../db/supabaseAdmin';

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getMyPaymentReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;
    const { id } = req.params;

    const { data: receipt, error } = await supabaseAdmin
      .from('receipts')
      .select('*')
      .eq('payment_id', id)
      .eq('student_id', student_id)
      .single();

    if (error || !receipt) {
      // Fall back to payment record and verify it belongs to this student
      const { data: payment, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

      if (pErr || !payment) {
        res.status(404).json({ success: false, error: 'Receipt not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          receipt_number: `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
          payment_id: payment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          issued_at: payment.created_at,
          signature_hash: payment.receipt_signature,
        },
      });
      return;
    }

    res.json({ success: true, data: receipt });
  } catch (error: any) {
    console.error('Get my payment receipt error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
