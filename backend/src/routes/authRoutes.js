import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { googleSignIn, me, signin, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' }
});

router.post('/signup', authLimiter, asyncHandler(signup));
router.post('/signin', authLimiter, asyncHandler(signin));
router.post('/google', authLimiter, asyncHandler(googleSignIn));
router.get('/me', requireAuth, me);

export default router;
