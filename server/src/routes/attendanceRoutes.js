import express from 'express';
import {
  scanTicket,
  getEventAttendanceRoster,
  exportAttendanceCsv,
} from '../controllers/attendanceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.post('/scan', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), scanTicket);
router.get('/events/:id', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventAttendanceRoster);
router.get('/events/:id/export', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), exportAttendanceCsv);

export default router;

