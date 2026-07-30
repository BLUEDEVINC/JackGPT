import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, RefreshCw, Share2, Sun } from 'lucide-react';
import api, { API_URL, clearAuthToken, errorMessage, onUnauthorized } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { AuthPanel } from '../components/AuthPanel';
import { Sidebar } from '../components/Sidebar';
import { MessageItem } from '../components/MessageItem';
import { ChatComposer } from '../components/ChatComposer';
import { SettingsPage } from './SettingsPage';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { dark, setDark } = useTheme();
  const bottomRef = useRef(null);

  const currentConversation = useMemo(() => conversations.find((c) => c._id === currentId), [conversations, currentId]);

  useEffect(() => onUnauthorized(() => setToken(null)), []);

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/conversations');
    setConversations(data.conversations);
    return data.conversations;
  }, []);

  const loadMessages = useCallback(async (id) => {
    const { data } = await api.get(`/conversations/${id}/messages`);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setConversations([]);
      setCurrentId('');
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [{ data }, list] = await Promise.all([api.get('/auth/me'), loadConversations()]);
        if (cancelled) return;
        setUser(data.user);
        setCurrentId((id) => id || list[0]?._id || '');
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Could not load your conversations.'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, loadConversations]);

  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      return;
    }
    loadMessages(currentId).catch((err) => setError(errorMessage(err, 'Could not load messages.')));
  }, [currentId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const onAuth = async (mode, payload) => {
    const path = mode === 'signup' ? '/auth/signup' : mode === 'signin' ? '/auth/signin' : '/auth/google';
    const { data } = await api.post(path, payload);
    localStorage.setItem('auth_token', data.token);
    setError('');
    setToken(data.token);
  };

  const signOut = () => {
    clearAuthToken();
    setToken(null);
  };

  const createConversation = async () => {
    setError('');
    const { data } = await api.post('/conversations', { title: 'New conversation' });
    setConversations((prev) => [data.conversation, ...prev]);
    setCurrentId(data.conversation._id);
    return data.conversation._id;
  };

  const renameConversation = async (conv) => {
    const title = window.prompt('Rename conversation', conv.title);
    if (!title?.trim()) return;
    try {
      const { data } = await api.patch(`/conversations/${conv._id}`, { title: title.trim() });
      setConversations((prev) => prev.map((c) => (c._id === conv._id ? data.conversation : c)));
    } catch (err) {
      setError(errorMessage(err, 'Could not rename this conversation.'));
    }
  };

  const deleteConversation = async (id) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api.delete(`/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (currentId === id) setCurrentId('');
    } catch (err) {
      setError(errorMessage(err, 'Could not delete this conversation.'));
    }
  };

  const streamReply = async (convId, content) => {
    const stamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, _id: `tmp-user-${stamp}` },
      { role: 'assistant', content: '', _id: `tmp-ai-${stamp}` }
    ]);

    const appendToLast = (text) =>
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: last.content + text };
        return copy;
      });

    const response = await fetch(`${API_URL}/conversations/${convId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      if (response.status === 401) clearAuthToken();
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamError = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        let payload;
        try {
          payload = JSON.parse(event.slice(6));
        } catch {
          continue;
        }
        if (payload.error) streamError = payload.error;
        if (payload.token) appendToLast(payload.token);
      }
    }

    if (streamError) throw new Error(streamError);
  };

  const sendMessage = async (content) => {
    setError('');
    setLoading(true);
    try {
      const convId = currentId || (await createConversation());
      await streamReply(convId, content);
      await loadConversations();
      await loadMessages(convId);
    } catch (err) {
      setError(errorMessage(err, 'The assistant could not reply. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    if (!currentId || loading) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/conversations/${currentId}/regenerate`);
      setMessages((prev) => {
        const copy = [...prev];
        const lastAssistant = copy.map((m) => m.role).lastIndexOf('assistant');
        if (lastAssistant !== -1) copy.splice(lastAssistant, 1);
        const lastUser = copy.map((m) => m.role).lastIndexOf('user');
        if (lastUser !== -1) copy.splice(lastUser, 1);
        return copy;
      });
      await streamReply(currentId, data.content);
      await loadMessages(currentId);
    } catch (err) {
      setError(errorMessage(err, 'Could not regenerate the response.'));
      await loadMessages(currentId).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const shareCurrent = async () => {
    if (!currentId) return;
    try {
      const { data } = await api.post(`/conversations/${currentId}/share`);
      const url = `${window.location.origin}/shared/${data.sharedToken}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      setError('');
      window.prompt('Share link (copied to clipboard)', url);
    } catch (err) {
      setError(errorMessage(err, 'Could not create a share link.'));
    }
  };

  const exportCurrent = async (format) => {
    if (!currentId) return;
    let url;
    try {
      const res = await fetch(`${API_URL}/conversations/${currentId}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(currentConversation?.title || 'conversation').replace(/[^\w.-]+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(errorMessage(err, 'Could not export this conversation.'));
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  if (!token) return <AuthPanel onAuth={onAuth} />;

  return (
    <div className="flex h-full bg-canvas text-fg">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={setCurrentId}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        onOpenSettings={() => setShowSettings(true)}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel p-3">
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{currentConversation?.title || 'ChatGPT Clone'}</h1>
            <p className="text-xs text-muted">
              Logged in as {user?.email}{' '}
              <button className="underline" onClick={signOut}>
                Sign out
              </button>
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded bg-surface p-2"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={regenerate} aria-label="Regenerate response" disabled={loading} className="rounded bg-surface p-2 disabled:opacity-50">
              <RefreshCw size={16} />
            </button>
            <button onClick={shareCurrent} aria-label="Share conversation" className="rounded bg-surface p-2">
              <Share2 size={16} />
            </button>
            <button onClick={() => exportCurrent('json')} className="rounded bg-surface px-2">Export JSON</button>
            <button onClick={() => exportCurrent('md')} className="rounded bg-surface px-2">Export MD</button>
          </div>
        </header>
        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 border-b border-line bg-red-500/10 p-3 text-sm text-red-400">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
          </div>
        )}
        <section className="flex-1 overflow-y-auto">
          {messages.map((m) => (
            <MessageItem key={m._id} message={m} onCopy={(c) => navigator.clipboard?.writeText(c)} />
          ))}
          {loading && <div className="p-4 text-center text-sm text-muted">AI is typing…</div>}
          <div ref={bottomRef} />
        </section>
        <ChatComposer onSend={sendMessage} disabled={loading} />
      </main>
      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  );
}
