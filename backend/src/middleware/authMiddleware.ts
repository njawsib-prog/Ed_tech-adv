import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload, UserRole } from '../types';
import config from '../config/env';
import { supabaseAdmin } from '../db/supabaseAdmin';

// Use JWT secret from centralized config
const JWT_SECRET = config.jwtSecret;

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from cookie
    const token = req.cookies?.token;

    console.log('[AuthMiddleware] Checking authentication:', {
      path: req.path,
      method: req.method,
      hasCookieToken: !!token,
      cookieTokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
      allCookies: Object.keys(req.cookies || {})
    });

    if (!token) {
      console.log('[AuthMiddleware] No token found in cookies');
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    console.log('[AuthMiddleware] Token verified successfully:', {
      userId: decoded.id,
      userRole: decoded.role,
      userEmail: decoded.email
    });

    // For students: enforce real-time status check on every request
    // This ensures that when an admin deactivates/suspends a student,
    // the effect is immediate even for already-logged-in students.
    if (decoded.role === 'student') {
      const { data: student, error } = await supabaseAdmin
        .from('students')
        .select('id, status, is_active')
        .eq('id', decoded.id)
        .single();

      if (error || !student) {
        res.status(401).json({ error: 'Account not found' });
        return;
      }

      // Support both new 'status' column and legacy 'is_active' boolean
      const studentStatus: string = student.status ?? (student.is_active ? 'ACTIVE' : 'INACTIVE');
      if (studentStatus !== 'ACTIVE') {
        const message =
          studentStatus === 'SUSPENDED'
            ? 'Your account has been suspended. Please contact your institution.'
            : 'Your account is inactive. Please contact your institution.';
        res.status(403).json({ error: message, code: 'ACCOUNT_INACTIVE' });
        return;
      }
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Alias for consistency with route imports
export const authenticate = authMiddleware;

// Helper to require admin role
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

// Helper to require specific roles
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export default authMiddleware;