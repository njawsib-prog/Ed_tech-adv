import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

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

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id,
        branch_id,
        amount,
        status,
        payment_method,
        transaction_id,
        description,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
