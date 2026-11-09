import express from 'express';
import { getFavorites, toggleFavorite } from '../controllers/favoriteController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getFavorites);
router.post('/:id', requireAuth, toggleFavorite);

export default router;

