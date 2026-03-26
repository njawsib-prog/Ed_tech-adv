import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import bcrypt from 'bcrypt';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get student profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        name,
        email,
        roll_number,
        phone,
        avatar_url,
        created_at,
        last_login,
        is_active
      `)
      .eq('id', studentId)
      .eq('institute_id', instituteId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update student profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { name, phone, avatar_url } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
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
      .from('students')
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
      .from('students')
      .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Get student activity
export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { limit = 20 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .eq('user_id', studentId)
      .eq('user_type', 'student')
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

// Delete account (soft delete)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // Verify password
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('password_hash')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isValid = await bcrypt.compare(password, student.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Soft delete by deactivating
    const { error } = await supabaseAdmin
      .from('students')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Default preferences
    const defaultPrefs = {
      emailNotifications: true,
      testReminders: true,
      resultNotifications: true,
      announcementNotifications: true
    };

    // Could be stored in a separate table, returning defaults for now
    res.json(defaultPrefs);
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const prefs = req.body;

    // Could store in a separate table, for now just acknowledge
    res.json({ message: 'Preferences updated', preferences: prefs });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};