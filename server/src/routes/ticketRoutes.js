import express from 'express';
import { getTicketDetails } from '../controllers/ticketController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:ticketCode', requireAuth, getTicketDetails);

export default router;

