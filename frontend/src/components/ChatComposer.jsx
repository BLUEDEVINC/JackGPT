import { useState } from 'react';

export function ChatComposer({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const content = value.trim();
    if (!content) return;

    // Keep the draft if sending fails so the user does not lose their message.
    setValue('');
    try {
      await onSend(content);
    } catch (err) {
      console.error('Failed to send message', err);
      setValue((current) => current || content);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-3xl gap-2 p-3">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} className="h-20 flex-1 rounded bg-slate-800 p-3 text-slate-100" placeholder="Message AI..." />
      <button disabled={disabled} className="rounded bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-60">Send</button>
    </form>
  );
}
