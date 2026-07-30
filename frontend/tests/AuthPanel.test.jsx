import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <div>
      <button onClick={() => onSuccess({ credential: 'google-credential' })}>google-success</button>
      <button onClick={() => onError()}>google-error</button>
    </div>
  )
}));

const { AuthPanel } = await import('../src/components/AuthPanel');

describe('AuthPanel', () => {
  it('hides the name field in sign-in mode and submits sign-in credentials', async () => {
    const onAuth = vi.fn();
    render(<AuthPanel onAuth={onAuth} />);

    expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Email'), 'jack@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onAuth).toHaveBeenCalledWith('signin', {
      name: '',
      email: 'jack@example.com',
      password: 'hunter2'
    });
  });

  it('reveals the name field in sign-up mode and submits it', async () => {
    const onAuth = vi.fn();
    render(<AuthPanel onAuth={onAuth} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Jack');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'jack@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onAuth).toHaveBeenCalledWith('signup', {
      name: 'Jack',
      email: 'jack@example.com',
      password: 'hunter2'
    });
  });

  it('keeps typed values when switching back to sign in and reports signin mode', async () => {
    const onAuth = vi.fn();
    render(<AuthPanel onAuth={onAuth} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await userEvent.type(screen.getByPlaceholderText('Email'), 'jack@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByPlaceholderText('Email')).toHaveValue('jack@example.com');
    expect(onAuth).toHaveBeenCalledWith('signin', expect.objectContaining({ email: 'jack@example.com' }));
  });

  it('masks the password input', () => {
    render(<AuthPanel onAuth={vi.fn()} />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
  });

  it('forwards the google credential as an idToken', async () => {
    const onAuth = vi.fn();
    render(<AuthPanel onAuth={onAuth} />);

    await userEvent.click(screen.getByRole('button', { name: 'google-success' }));

    expect(onAuth).toHaveBeenCalledWith('google', { idToken: 'google-credential' });
  });

  it('ignores google errors without calling onAuth', async () => {
    const onAuth = vi.fn();
    render(<AuthPanel onAuth={onAuth} />);

    await userEvent.click(screen.getByRole('button', { name: 'google-error' }));

    expect(onAuth).not.toHaveBeenCalled();
  });
});
