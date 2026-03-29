import { Router } from 'express';
import { getDashboardStats } from '../controllers/admin/dashboard.controller';
import {
  getStudents,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/admin/student.controller';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from '../controllers/admin/branch.controller';
import {
  getAttendance,
  getStudentsForAttendance,
  markAttendance,
  updateAttendance,
} from '../controllers/admin/attendance.controller';
import {
  getPayments,
  recordPayment,
  updatePaymentStatus,
  verifyPayment,
} from '../controllers/admin/payment.controller';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rate limiters for sensitive admin operations
const bulkUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: { error: 'Too many bulk upload attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentRecordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 payment records per minute
  message: { error: 'Too many payment recording attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin', 'branch_admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Students
router.get('/students', getStudents);
router.post('/students', createStudent);
router.post('/students/bulk', bulkUploadLimiter, upload.single('file'), bulkUploadStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Branches
router.get('/branches', getBranches);
router.post('/branches', createBranch);
router.put('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);

// Attendance
router.get('/attendance', getAttendance);
router.get('/attendance/students-listing', getStudentsForAttendance);
router.post('/attendance', markAttendance);
router.put('/attendance/:id', updateAttendance);

// Payments
router.get('/payments', getPayments);
router.post('/payments', paymentRecordLimiter, recordPayment);
router.put('/payments/:id', updatePaymentStatus);
router.get('/payments/:id/verify', verifyPayment);

export default router;