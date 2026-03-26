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
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);
router.put('/notifications/:id', updateNotification);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/:id/broadcast', broadcastNotification);

// Complaints
router.get('/complaints', getComplaints);
router.get('/complaints/:id', getComplaintById);
router.post('/complaints/:id/reply', replyToComplaint);
router.patch('/complaints/:id/status', updateComplaintStatus);

// Feedback
router.get('/feedback', getFeedback);
router.get('/feedback/stats', getFeedbackStats);

export default router;