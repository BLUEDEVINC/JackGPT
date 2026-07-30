import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from '../src/components/ChatComposer';

describe('ChatComposer', () => {
  it('sends the typed message and clears the textarea', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message AI...');

    await userEvent.type(textarea, 'hello there');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('hello there');
    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('ignores empty and whitespace-only submissions', async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await userEvent.type(screen.getByPlaceholderText('Message AI...'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('preserves surrounding whitespace in the sent content', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatComposer onSend={onSend} />);

    await userEvent.type(screen.getByPlaceholderText('Message AI...'), '  hi  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('  hi  ');
  });

  it('keeps the text until onSend resolves', async () => {
    let resolveSend;
    const onSend = vi.fn(() => new Promise((resolve) => {
      resolveSend = resolve;
    }));
    render(<ChatComposer onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message AI...');

    await userEvent.type(textarea, 'hello');
    screen.getByRole('button', { name: 'Send' }).click();

    await waitFor(() => expect(onSend).toHaveBeenCalled());
    expect(textarea).toHaveValue('hello');

    resolveSend();
    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('disables the send button while a response is streaming', () => {
    render(<ChatComposer onSend={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
