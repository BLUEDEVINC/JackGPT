import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../src/components/Sidebar';

const conversations = [
  { _id: 'c1', title: 'Trip planning' },
  { _id: 'c2', title: 'Debugging' }
];

function setup(props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onOpenSettings: vi.fn()
  };
  render(<Sidebar conversations={conversations} currentId="c1" {...handlers} {...props} />);
  return handlers;
}

describe('Sidebar', () => {
  it('lists every conversation title', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Trip planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Debugging' })).toBeInTheDocument();
  });

  it('highlights only the active conversation', () => {
    setup();
    const active = screen.getByRole('button', { name: 'Trip planning' }).parentElement;
    const inactive = screen.getByRole('button', { name: 'Debugging' }).parentElement;

    expect(active).toHaveClass('bg-slate-700');
    expect(inactive).toHaveClass('bg-slate-800');
  });

  it('selects a conversation by id', async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Debugging' }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('creates a new chat', async () => {
    const { onCreate } = setup();
    await userEvent.click(screen.getByRole('button', { name: /New chat/ }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renames with the whole conversation and deletes by id', async () => {
    const { onRename, onDelete } = setup();

    await userEvent.click(screen.getAllByRole('button', { name: 'Rename' })[1]);
    expect(onRename).toHaveBeenCalledWith(conversations[1]);

    const deleteButtons = screen
      .getAllByRole('button')
      .filter((button) => button.textContent === '' && button.querySelector('svg'));
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('opens settings', async () => {
    const { onOpenSettings } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Settings/ }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders an empty list without crashing', () => {
    setup({ conversations: [] });
    expect(screen.getByRole('button', { name: /New chat/ })).toBeInTheDocument();
  });
});
