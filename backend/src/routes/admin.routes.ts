import { Router } from 'express';
import { getDashboardStats } from '../controllers/admin/dashboard.controller';
import {
  getStudents,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/admin/student.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Students
router.get('/students', getStudents);
router.post('/students', createStudent);
router.post('/students/bulk', upload.single('file'), bulkUploadStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

export default router;