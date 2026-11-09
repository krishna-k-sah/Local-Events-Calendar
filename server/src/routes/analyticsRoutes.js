import express from 'express';
import { getOrganizerAnalytics } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getOrganizerAnalytics);

export default router;

