import { Router } from 'express';
import { getSharedConversation } from '../controllers/conversationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/:token', asyncHandler(getSharedConversation));

export default router;
