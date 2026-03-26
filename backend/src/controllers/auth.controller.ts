import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../db/supabaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '7d';

// Validate JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    console.warn('[Auth] JWT_SECRET not set - using development mode only');
  }
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

// Admin Login
export const adminLogin = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Fetch admin by email
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET || 'dev-secret-do-not-use-in-production',
      { expiresIn: JWT_EXPIRY }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar_url: admin.avatar_url,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Student Login
export const studentLogin = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Fetch student by email
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !student) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, student.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('students')
      .update({ last_login: new Date().toISOString() })
      .eq('id', student.id);

    // Generate JWT
    const token = jwt.sign(
      { id: student.id, email: student.email, role: 'student' },
      JWT_SECRET || 'dev-secret-do-not-use-in-production',
      { expiresIn: JWT_EXPIRY }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        course_id: student.course_id,
        avatar_url: student.avatar_url,
      },
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
export const logout = (req: Request, res: Response): void => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let userData;
    if (user.role === 'admin') {
      const { data, error } = await supabaseAdmin
        .from('admins')
        .select('id, name, email, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      userData = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('id, name, email, course_id, avatar_url')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      userData = { ...data, role: 'student' };
    }

    res.json({ user: userData });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Always return success message for security (don't reveal if email exists)
    res.json({
      message: 'If this email exists, a reset link has been sent.',
    });

    // In production, you would:
    // 1. Check if email exists
    // 2. Generate a reset token
    // 3. Send email with reset link
    // For now, we just return success
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};