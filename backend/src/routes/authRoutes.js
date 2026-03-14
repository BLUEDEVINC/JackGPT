import { Router } from 'express';
import { googleSignIn, me, signin, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/google', googleSignIn);
router.get('/me', requireAuth, me);

export default router;
