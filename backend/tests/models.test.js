import { describe, expect, it } from 'vitest';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';

describe('User model', () => {
  it('requires a name and email and defaults the auth provider to local', () => {
    const errors = new User({}).validateSync().errors;
    expect(Object.keys(errors).sort()).toEqual(['email', 'name']);
    expect(new User({ name: 'Jack', email: 'a@b.c' }).authProvider).toBe('local');
  });

  it('restricts the auth provider to local or google', () => {
    const invalid = new User({ name: 'Jack', email: 'a@b.c', authProvider: 'facebook' });
    expect(invalid.validateSync().errors.authProvider).toBeDefined();
    expect(new User({ name: 'Jack', email: 'a@b.c', authProvider: 'google' }).validateSync()).toBeUndefined();
  });
});

describe('Conversation model', () => {
  it('requires an owner and applies title and system prompt defaults', () => {
    expect(new Conversation({}).validateSync().errors.userId).toBeDefined();

    const conversation = new Conversation({ userId: '507f1f77bcf86cd799439011' });
    expect(conversation.title).toBe('New conversation');
    expect(conversation.systemPrompt).toBe('You are a helpful AI assistant.');
    expect(conversation.validateSync()).toBeUndefined();
  });
});

describe('Message model', () => {
  const base = {
    conversationId: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    role: 'user',
    content: 'hi'
  };

  it('requires conversation, user, role and content', () => {
    const errors = new Message({}).validateSync().errors;
    expect(Object.keys(errors).sort()).toEqual(['content', 'conversationId', 'role', 'userId']);
  });

  it('accepts only known roles and defaults edited to false', () => {
    expect(new Message({ ...base, role: 'tool' }).validateSync().errors.role).toBeDefined();

    const message = new Message(base);
    expect(message.edited).toBe(false);
    expect(message.validateSync()).toBeUndefined();
  });
});
