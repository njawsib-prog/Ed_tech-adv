import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types';
import config from '../config/env';

// Use JWT secret from centralized config
const JWT_SECRET = config.jwtSecret;

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get token from cookie
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;