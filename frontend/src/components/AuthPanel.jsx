import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { errorMessage } from '../lib/api';
import { TextInput } from './TextInput';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const run = async (authMode, payload) => {
    setError('');
    setPending(true);
    try {
      await onAuth(authMode, payload);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in.'));
    } finally {
      setPending(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    run(mode, form);
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-panel p-6 text-fg">
      <h1 className="mb-4 text-2xl font-bold">ChatGPT Clone</h1>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`rounded px-3 py-2 ${mode === 'signin' ? 'bg-line' : 'bg-surface'}`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`rounded px-3 py-2 ${mode === 'signup' ? 'bg-line' : 'bg-surface'}`}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        {mode === 'signup' && (
          <TextInput
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        )}
        <TextInput
          placeholder="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <TextInput
          placeholder="Password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          className="w-full rounded bg-brand p-2 font-semibold text-black disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {pending ? 'Please wait…' : 'Continue'}
        </button>
      </form>
      {googleClientId && (
        <>
          <div className="mt-4 text-xs text-muted">Or continue with Google</div>
          <GoogleLogin
            onSuccess={(credentialResponse) => run('google', { idToken: credentialResponse.credential })}
            onError={() => setError('Google sign-in failed.')}
          />
        </>
      )}
    </div>
  );
}
