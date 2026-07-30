import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { googleSignIn, me, signin, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' }
});

router.post('/signup', credentialsLimiter, asyncHandler(signup));
router.post('/signin', credentialsLimiter, asyncHandler(signin));
router.post('/google', credentialsLimiter, asyncHandler(googleSignIn));
router.get('/me', requireAuth, me);

export default router;
