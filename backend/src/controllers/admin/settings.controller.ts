import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all settings
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value, category');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Convert array to object
    const settings = data?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>);

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update settings
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body;

    // Upsert each setting
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? value : { val: value },
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      await supabaseAdmin
        .from('settings')
        .upsert(update, { onConflict: 'key' });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Change admin password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Verify current password
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', adminId)
      .single();

    if (fetchError || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// List all admins
export const listAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, created_at, last_login')
      .in('role', ['admin', 'branch_admin', 'super_admin'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: 'Failed to list admins' });
  }
};

export default {
  getSettings,
  updateSettings,
  changePassword,
  listAdmins,
};
