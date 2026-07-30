import { Router } from 'express';
import { googleSignIn, me, signin, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/signup', asyncHandler(signup));
router.post('/signin', asyncHandler(signin));
router.post('/google', asyncHandler(googleSignIn));
router.get('/me', asyncHandler(requireAuth), me);

export default router;
