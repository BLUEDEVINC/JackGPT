import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '../src/hooks/useTheme';

function Probe() {
  const { dark, setDark } = useTheme();
  return (
    <button onClick={() => setDark((d) => !d)}>{dark ? 'dark' : 'light'}</button>
  );
}

describe('useTheme', () => {
  it('defaults to dark mode and applies the class and stored preference', () => {
    render(<Probe />);

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('starts light only when the stored theme is exactly "light"', () => {
    localStorage.setItem('theme', 'light');
    render(<Probe />);

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('treats an unrecognised stored value as dark', () => {
    localStorage.setItem('theme', 'solarized');
    render(<Probe />);

    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('toggles the document class and persists the new preference', async () => {
    render(<Probe />);

    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');

    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('does not leave a stale class when remounted after switching to light', async () => {
    const { unmount } = render(<Probe />);
    await userEvent.click(screen.getByRole('button'));
    unmount();

    await act(async () => {
      render(<Probe />);
    });

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
