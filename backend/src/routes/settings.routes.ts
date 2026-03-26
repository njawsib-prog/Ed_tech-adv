import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  getSettings,
  updateSettings,
  getInstituteConfig,
  updateInstituteConfig,
  changePassword,
  getActivityLog,
  createAdmin,
  deleteAdmin,
  listAdmins
} from '../controllers/admin/settings.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Settings
router.get('/', getSettings);
router.put('/', updateSettings);

// Institute config
router.get('/institute', getInstituteConfig);
router.put('/institute', updateInstituteConfig);

// Password
router.post('/change-password', changePassword);

// Activity log
router.get('/activity-log', getActivityLog);

// Admin management
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);

export default router;