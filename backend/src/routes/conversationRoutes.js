import { Router } from 'express';
import {
  createConversation,
  deleteConversation,
  editMessage,
  exportConversation,
  getConversationMessages,
  listConversations,
  regenerateResponse,
  renameConversation,
  shareConversation,
  streamMessage
} from '../controllers/conversationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listConversations));
router.post('/', asyncHandler(createConversation));
router.patch('/:id', asyncHandler(renameConversation));
router.delete('/:id', asyncHandler(deleteConversation));
router.get('/:id/messages', asyncHandler(getConversationMessages));
router.patch('/:id/messages/:messageId', asyncHandler(editMessage));
router.post('/:id/share', asyncHandler(shareConversation));
router.post('/:id/regenerate', asyncHandler(regenerateResponse));
router.get('/:id/export', asyncHandler(exportConversation));
router.post('/:id/messages/stream', asyncHandler(streamMessage));

export default router;
