import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    console.warn('[AuthMiddleware] JWT_SECRET not set - using development mode only');
  }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get token from cookie
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      JWT_SECRET || 'dev-secret-do-not-use-in-production'
    ) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;