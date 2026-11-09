import express from 'express';
import {
  getEvents,
  getCalendarEvents,
  getFeaturedEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  getEventAttendees,
} from '../controllers/eventController.js';
import {
  registerForEvent,
  cancelRegistration,
} from '../controllers/registrationController.js';
import {
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
  getEventWaitlist,
} from '../controllers/waitlistController.js';
import {
  getEventAttendanceRoster,
  exportAttendanceCsv,
} from '../controllers/attendanceController.js';
import { toggleFavorite } from '../controllers/favoriteController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { createEventSchema, updateEventSchema } from '../validators/eventValidator.js';
import { upload, validateImageMagicBytes } from '../middleware/upload.js';

const router = express.Router();

// Public / Discovery routes
router.get('/', optionalAuth, getEvents);
router.get('/calendar', getCalendarEvents);
router.get('/featured', getFeaturedEvents);

// Organizer personal events
router.get('/organizer/my', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getOrganizerEvents);

// Single event
router.get('/:id', optionalAuth, getEventById);
router.get('/:id/attendees', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventAttendees);

// Event CRUD
router.post(
  '/',
  requireAuth,
  requireRole(['ORGANIZER', 'ADMIN']),
  validateBody(createEventSchema),
  createEvent
);
router.put(
  '/:id',
  requireAuth,
  requireRole(['ORGANIZER', 'ADMIN']),
  validateBody(updateEventSchema),
  updateEvent
);
router.delete('/:id', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), deleteEvent);

// Registration actions on event
router.post('/:id/register', requireAuth, registerForEvent);
router.delete('/:id/register', requireAuth, cancelRegistration);

// Waitlist actions on event
router.post('/:id/waitlist', requireAuth, joinWaitlist);
router.delete('/:id/waitlist', requireAuth, leaveWaitlist);
router.get('/:id/waitlist/status', optionalAuth, getWaitlistStatus);
router.get('/:id/waitlist', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventWaitlist);

// Attendance actions on event
router.get('/:id/attendance', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), getEventAttendanceRoster);
router.get('/:id/attendance/export', requireAuth, requireRole(['ORGANIZER', 'ADMIN']), exportAttendanceCsv);

// Favorite toggle on event
router.post('/:id/favorite', requireAuth, toggleFavorite);

// Image Poster Upload with Authentication, Multer validation & Magic Byte verification
router.post('/upload-poster', requireAuth, upload.single('poster'), validateImageMagicBytes, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl });
});

export default router;

