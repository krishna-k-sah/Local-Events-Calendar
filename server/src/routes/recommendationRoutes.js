import express from 'express';
import { getPersonalizedRecommendations } from '../controllers/recommendationController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getPersonalizedRecommendations);

export default router;

