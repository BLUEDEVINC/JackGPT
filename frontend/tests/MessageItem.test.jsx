import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageItem } from '../src/components/MessageItem';

describe('MessageItem', () => {
  it('renders markdown as HTML and labels the role', () => {
    render(<MessageItem message={{ role: 'assistant', content: '# Title\n\nsome **bold** text' }} onCopy={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('assistant')).toBeInTheDocument();
  });

  it('highlights fenced code blocks', () => {
    const { container } = render(
      <MessageItem message={{ role: 'assistant', content: '```js\nconst a = 1;\n```' }} onCopy={vi.fn()} />
    );

    const code = container.querySelector('pre code');
    expect(code).toBeInTheDocument();
    expect(code.className).toContain('language-js');
  });

  it('sanitises dangerous markup', () => {
    const { container } = render(
      <MessageItem
        message={{ role: 'user', content: '<img src=x onerror="alert(1)"><script>alert(2)</script>ok' }}
        onCopy={vi.fn()}
      />
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(container.textContent).toContain('ok');
  });

  it('renders empty content without crashing', () => {
    render(<MessageItem message={{ role: 'assistant', content: '' }} onCopy={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('styles assistant and user turns differently', () => {
    const { container: assistant } = render(
      <MessageItem message={{ role: 'assistant', content: 'a' }} onCopy={vi.fn()} />
    );
    const { container: user } = render(<MessageItem message={{ role: 'user', content: 'a' }} onCopy={vi.fn()} />);

    expect(assistant.firstChild).toHaveClass('bg-slate-800');
    expect(user.firstChild).toHaveClass('bg-slate-900');
  });

  it('copies the raw markdown, not the rendered HTML', async () => {
    const onCopy = vi.fn();
    render(<MessageItem message={{ role: 'user', content: '**raw**' }} onCopy={onCopy} />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(onCopy).toHaveBeenCalledWith('**raw**');
  });
});
