import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminLogin, studentLogin, logout, getCurrentUser, forgotPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Rate limiter for login routes - 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/admin/login', loginLimiter, adminLogin);
router.post('/student/login', loginLimiter, studentLogin);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getCurrentUser);

export default router;