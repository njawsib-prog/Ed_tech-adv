import { Router } from 'express';
import { getStudentDashboard } from '../controllers/student/dashboard.controller';
import {
  getStudentTests,
  getTestDetails,
  startTest,
  submitTest,
} from '../controllers/student/test.controller';
import {
  getMyResults,
  getResultDetails,
  getMyPerformance,
} from '../controllers/student/results.controller';
import {
  getStudyMaterials,
  getMaterialById,
  getMaterialsBySubject,
  getRecentlyViewed,
  getMySubjects,
} from '../controllers/student/materials.controller';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  submitFeedback,
  getMyFeedback,
} from '../controllers/student/notifications.controller';
import {
  getProfile,
  updateProfile,
  changePassword,
  getActivity,
  deleteAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/student/profile.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// All routes require authentication and student role
router.use(authMiddleware);
router.use(requireRole('student'));

// Dashboard
router.get('/dashboard', getStudentDashboard);

// Tests
router.get('/tests', getStudentTests);
router.get('/tests/:id', getTestDetails);
router.post('/tests/:id/start', startTest);
router.post('/tests/:id/submit', submitTest);

// Results
router.get('/results', getMyResults);
router.get('/results/:id', getResultDetails);
router.get('/performance', getMyPerformance);

// Study Materials
router.get('/materials', getStudyMaterials);
router.get('/materials/recent', getRecentlyViewed);
router.get('/materials/subjects', getMySubjects);
router.get('/materials/:id', getMaterialById);
router.get('/materials/subject/:subjectId', getMaterialsBySubject);

// Notifications
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadCount);
router.post('/notifications/:id/read', markAsRead);
router.post('/notifications/read-all', markAllAsRead);

// Complaints
router.post('/complaints', submitComplaint);
router.get('/complaints', getMyComplaints);
router.get('/complaints/:id', getComplaintById);

// Feedback
router.post('/feedback', submitFeedback);
router.get('/feedback', getMyFeedback);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/change-password', changePassword);
router.get('/profile/activity', getActivity);
router.delete('/profile', deleteAccount);
router.get('/profile/notification-preferences', getNotificationPreferences);
router.put('/profile/notification-preferences', updateNotificationPreferences);

export default router;