import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../db/supabaseAdmin';
import config from '../config/env';
import { isStudentActive, resolveStudentStatus } from '../utils/studentStatus';

// Use JWT secret from centralized config
const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRY = config.jwtExpiresIn;

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
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Fetch admin by email – do NOT filter on is_active here so that
    // admins whose is_active column is NULL (e.g. created before the
    // column was added) are not silently rejected with "Invalid credentials".
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Check that the admin account is active.  Treat NULL is_active as active
    // for backward-compatibility with rows that pre-date the column.
    if (admin.is_active === false || admin.status === 'INACTIVE' || admin.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: 'Your account is inactive. Please contact support.' });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' as const },
      JWT_SECRET || 'dev-secret-do-not-use-in-production',
      { expiresIn: JWT_EXPIRY } as any
    );

    // Determine cookie options based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'lax' | 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log('[Auth] Admin login successful - setting cookie with options:', {
      isProduction,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    // Set httpOnly cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      data: {
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          avatar_url: admin.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Student Login
export const studentLogin = async (req: LoginRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Fetch student by email – check both status (new) and is_active (legacy)
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !student) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Support both new 'status' column and legacy 'is_active' boolean
    if (!isStudentActive(student)) {
      const effectiveStatus = resolveStudentStatus(student);
      const message =
        effectiveStatus === 'SUSPENDED'
          ? 'Your account has been suspended. Please contact your institution.'
          : 'Your account is inactive. Please contact your institution.';
      res.status(403).json({ success: false, error: message });
      return;
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, student.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await supabaseAdmin
      .from('students')
      .update({ last_login: new Date().toISOString() })
      .eq('id', student.id);

    // Generate JWT
    const token = jwt.sign(
      { id: student.id, email: student.email, role: 'student' as const },
      JWT_SECRET || 'dev-secret-do-not-use-in-production',
      { expiresIn: JWT_EXPIRY } as any
    );

    // Determine cookie options based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'lax' | 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log('[Auth] Student login successful - setting cookie with options:', {
      isProduction,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    // Set httpOnly cookie
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      data: {
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: 'student',
          course_id: student.course_id,
          avatar_url: student.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Logout
export const logout = (req: Request, res: Response): void => {
  // Determine cookie options based on environment (must match login)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'lax' | 'none',
  };

  console.log('[Auth] Logout - clearing cookie with options:', {
    isProduction,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  });

  res.clearCookie('token', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    console.log('[Auth] getCurrentUser called - user from auth middleware:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      hasCookieToken: !!req.cookies?.token,
      cookieTokenPrefix: req.cookies?.token?.substring(0, 20) + '...'
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
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
        res.status(404).json({ success: false, error: 'User not found' });
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
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      userData = { ...data, role: 'student' };
    }

    res.json({ success: true, data: { user: userData } });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Always return success message for security (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    });

    // In production, you would:
    // 1. Check if email exists
    // 2. Generate a reset token
    // 3. Send email with reset link
    // For now, we just return success
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};