import { Router } from 'express';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/admin/course.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'super_admin'));

// Course routes
router.get('/', getCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

// Module routes
router.get('/:id/modules', getCourseModules);
router.post('/:id/modules', createModule);

// Subject routes (module-level)
router.post('/modules/:id/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// Module management
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);

export default router;