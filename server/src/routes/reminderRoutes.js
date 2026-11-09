import express from 'express';
import { triggerReminders, getRemindersHistory } from '../controllers/reminderController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.post('/trigger', requireAuth, requireRole(['ADMIN', 'ORGANIZER']), triggerReminders);
router.get('/history', requireAuth, requireRole(['ADMIN']), getRemindersHistory);

export default router;

