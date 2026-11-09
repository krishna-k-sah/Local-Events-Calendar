import express from 'express';
import { getUserRegistrations } from '../controllers/registrationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', requireAuth, getUserRegistrations);

export default router;

