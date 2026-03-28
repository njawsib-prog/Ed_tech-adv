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
  markAttendance,
  updateAttendance,
} from '../controllers/admin/attendance.controller';
import {
  getPayments,
  recordPayment,
  updatePaymentStatus,
} from '../controllers/admin/payment.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin', 'branch_admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Students
router.get('/students', getStudents);
router.post('/students', createStudent);
router.post('/students/bulk', upload.single('file'), bulkUploadStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Branches
router.get('/branches', getBranches);
router.post('/branches', createBranch);
router.put('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);

// Attendance
router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);
router.put('/attendance/:id', updateAttendance);

// Payments
router.get('/payments', getPayments);
router.post('/payments', recordPayment);
router.put('/payments/:id', updatePaymentStatus);

export default router;