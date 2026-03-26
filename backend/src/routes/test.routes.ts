import { Router } from 'express';
import multer from 'multer';
import {
  getTests,
  createTest,
  updateTest,
  deleteTest,
  getTestQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  assignTest,
} from '../controllers/admin/test.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin'));

// Test routes
router.get('/', getTests);
router.post('/', createTest);
router.put('/:id', updateTest);
router.delete('/:id', deleteTest);

// Question routes
router.get('/:id/questions', getTestQuestions);
router.post('/:id/questions', addQuestion);
router.post('/:id/questions/bulk', upload.single('file'), bulkUploadQuestions);

// Individual question routes
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// Test assignment
router.post('/:id/assign', assignTest);

export default router;