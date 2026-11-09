import express from 'express';
import {
  getDashboardMetrics,
  getUsers,
  updateUserRole,
  deleteUser,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getReportsData,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Enforce ADMIN role across all routes in this router
router.use(requireAuth, requireRole(['ADMIN']));

// Dashboard metrics
router.get('/dashboard', getDashboardMetrics);

// User governance
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Event moderation
router.get('/events/pending', getPendingEvents);
router.put('/events/:id/approve', approveEvent);
router.put('/events/:id/reject', rejectEvent);

// Category management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Reports & CSV export data
router.get('/reports', getReportsData);

export default router;

