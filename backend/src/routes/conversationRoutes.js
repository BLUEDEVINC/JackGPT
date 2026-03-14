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

const router = Router();

router.get('/', listConversations);
router.post('/', createConversation);
router.patch('/:id', renameConversation);
router.delete('/:id', deleteConversation);
router.get('/:id/messages', getConversationMessages);
router.patch('/:id/messages/:messageId', editMessage);
router.post('/:id/share', shareConversation);
router.post('/:id/regenerate', regenerateResponse);
router.get('/:id/export', exportConversation);
router.post('/:id/messages/stream', streamMessage);

export default router;
