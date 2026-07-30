import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../src/pages/SettingsPage';

describe('SettingsPage', () => {
  it('renders the settings dialog content', () => {
    render(<SettingsPage onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText(/Manage account, theme, and app preferences/)).toBeInTheDocument();
  });

  it('closes on the close button', async () => {
    const onClose = vi.fn();
    render(<SettingsPage onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
