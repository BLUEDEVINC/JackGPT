import { useState } from 'react';

export function ChatComposer({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;
    setValue('');
    await onSend(content);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl gap-2 p-3">
      <label className="sr-only" htmlFor="composer">
        Message AI
      </label>
      <textarea
        id="composer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        className="h-20 flex-1 rounded bg-surface p-3 text-fg placeholder:text-muted"
        placeholder="Message AI… (Enter to send, Shift+Enter for a new line)"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded bg-brand px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
