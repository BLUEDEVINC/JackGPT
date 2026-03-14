import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

export function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const submit = (event) => {
    event.preventDefault();
    onAuth(mode, form);
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
      <h1 className="mb-4 text-2xl font-bold">ChatGPT Clone</h1>
      <div className="mb-4 flex gap-2">
        <button className="rounded bg-slate-800 px-3 py-2" onClick={() => setMode('signin')}>Sign in</button>
        <button className="rounded bg-slate-800 px-3 py-2" onClick={() => setMode('signup')}>Sign up</button>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        {mode === 'signup' && (
          <input
            className="w-full rounded bg-slate-800 p-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        )}
        <input className="w-full rounded bg-slate-800 p-2" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <input className="w-full rounded bg-slate-800 p-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <button className="w-full rounded bg-emerald-500 p-2 font-semibold text-black" type="submit">Continue</button>
      </form>
      <div className="mt-4 text-xs text-slate-400">Or continue with Google</div>
      <GoogleLogin
        onSuccess={(credentialResponse) => onAuth('google', { idToken: credentialResponse.credential })}
        onError={() => {}}
      />
    </div>
  );
}
