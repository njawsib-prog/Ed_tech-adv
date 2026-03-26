import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getResults,
  getResultById,
  getTestAnalytics,
  getStudentPerformance,
  exportResultsCSV,
  deleteResult
} from '../controllers/admin/results.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Results management
router.get('/', getResults);
router.get('/export', exportResultsCSV);
router.get('/:id', getResultById);
router.delete('/:id', deleteResult);

// Analytics
router.get('/analytics/test/:testId', getTestAnalytics);
router.get('/analytics/student/:studentId', getStudentPerformance);

export default router;