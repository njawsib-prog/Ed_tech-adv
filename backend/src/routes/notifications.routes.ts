import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  broadcastNotification,
  getComplaints,
  getComplaintById,
  replyToComplaint,
  updateComplaintStatus,
  getFeedback,
  getFeedbackStats
} from '../controllers/admin/notifications.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Notifications
router.get('/', getNotifications);
router.post('/', createNotification);
router.put('/:id', updateNotification);
router.delete('/:id', deleteNotification);
router.post('/:id/broadcast', broadcastNotification);

// Complaints
router.get('/complaints', getComplaints);
router.get('/complaints/:id', getComplaintById);
router.post('/complaints/:id/reply', replyToComplaint);
router.patch('/complaints/:id/status', updateComplaintStatus);

// Feedback
router.get('/feedback', getFeedback);
router.get('/feedback/stats', getFeedbackStats);

export default router;