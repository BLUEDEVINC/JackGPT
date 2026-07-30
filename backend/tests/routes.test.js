import { describe, expect, it } from 'vitest';
import authRoutes from '../src/routes/authRoutes.js';
import conversationRoutes from '../src/routes/conversationRoutes.js';

function routeTable(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
      handlers: layer.route.stack.map((handler) => handler.name)
    }));
}

describe('authRoutes', () => {
  it('exposes the auth endpoints and protects /me with requireAuth', () => {
    expect(routeTable(authRoutes)).toEqual([
      { path: '/signup', methods: ['post'], handlers: ['signup'] },
      { path: '/signin', methods: ['post'], handlers: ['signin'] },
      { path: '/google', methods: ['post'], handlers: ['googleSignIn'] },
      { path: '/me', methods: ['get'], handlers: ['requireAuth', 'me'] }
    ]);
  });
});

describe('conversationRoutes', () => {
  it('maps every conversation endpoint to its controller', () => {
    expect(routeTable(conversationRoutes)).toEqual([
      { path: '/', methods: ['get'], handlers: ['listConversations'] },
      { path: '/', methods: ['post'], handlers: ['createConversation'] },
      { path: '/:id', methods: ['patch'], handlers: ['renameConversation'] },
      { path: '/:id', methods: ['delete'], handlers: ['deleteConversation'] },
      { path: '/:id/messages', methods: ['get'], handlers: ['getConversationMessages'] },
      { path: '/:id/messages/:messageId', methods: ['patch'], handlers: ['editMessage'] },
      { path: '/:id/share', methods: ['post'], handlers: ['shareConversation'] },
      { path: '/:id/regenerate', methods: ['post'], handlers: ['regenerateResponse'] },
      { path: '/:id/export', methods: ['get'], handlers: ['exportConversation'] },
      { path: '/:id/messages/stream', methods: ['post'], handlers: ['streamMessage'] }
    ]);
  });
});
