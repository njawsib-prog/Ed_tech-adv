import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all settings
export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Convert array to object
    const settings = data?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update settings
export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const settings = req.body;

    // Upsert each setting
    const updates = Object.entries(settings).map(([key, value]) => ({
      institute_id: instituteId,
      key,
      value: JSON.stringify(value)
    }));

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(updates, { onConflict: 'institute_id,key' });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Get institute config
export const getInstituteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('institute_config')
      .select('*')
      .eq('id', instituteId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get institute config error:', error);
    res.status(500).json({ error: 'Failed to fetch institute config' });
  }
};

// Update institute config
export const updateInstituteConfig = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const {
      name,
      logo_url,
      primary_color,
      secondary_color,
      contact_email,
      contact_phone,
      address,
      features
    } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (address !== undefined) updateData.address = address;
    if (features !== undefined) updateData.features = features;

    const { data, error } = await supabaseAdmin
      .from('institute_config')
      .update(updateData)
      .eq('id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update institute config error:', error);
    res.status(500).json({ error: 'Failed to update institute config' });
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

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Verify current password
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('password_hash')
      .eq('id', adminId)
      .single();

    if (fetchError || !admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabaseAdmin
      .from('admins')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', adminId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Get activity log
export const getActivityLog = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { page = 1, limit = 50, userId, action } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('institute_id', instituteId);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (action) {
      query = query.eq('action', action);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      activities: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
};

// Create admin account
export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { name, email, password, role = 'admin' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({
        institute_id: instituteId,
        name,
        email,
        password_hash: passwordHash,
        role
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ id: data.id, name: data.name, email: data.email, role: data.role });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
};

// Delete admin account
export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user?.id;

    if (id === currentAdminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabaseAdmin
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin account' });
  }
};

// List all admins
export const listAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, email, role, created_at, last_login')
      .eq('institute_id', instituteId)
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