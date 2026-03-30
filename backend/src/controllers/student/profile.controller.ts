import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '../../types';

interface AuthRequest extends Request {
  user?: JWTPayload;
  cookies: {
    token?: string;
    [key: string]: any;
  };
}

// Get student profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        roll_number,
        phone,
        avatar_url,
        created_at,
        last_login,
        is_active,
        branch_id,
        course_id
      `)
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

// Update student profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { name, phone, avatar_url } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', studentId)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get current password hash
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

// Get student activity
export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { limit = 20 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('type', 'audit')
      .eq('created_by', studentId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
};

// Delete account (soft delete)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required to delete account' });
    }

    // Verify password
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Soft delete by deactivating
    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: 'INACTIVE', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword,
  getActivity,
  deleteAccount,
};
