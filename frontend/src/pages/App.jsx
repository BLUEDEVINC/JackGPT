import { useCallback, useEffect, useMemo, useState } from 'react';
import { Moon, RefreshCw, Share2, Sun } from 'lucide-react';
import api, { API_BASE_URL, AUTH_TOKEN_KEY, getErrorMessage, onAuthExpired, readStoredToken } from '../lib/api';
import { removeStoredItem, setStoredItem } from '../lib/storage';
import { useTheme } from '../hooks/useTheme';
import { AuthPanel } from '../components/AuthPanel';
import { Sidebar } from '../components/Sidebar';
import { MessageItem } from '../components/MessageItem';
import { ChatComposer } from '../components/ChatComposer';
import { ErrorBanner } from '../components/ErrorBanner';
import { SettingsPage } from './SettingsPage';

export function App() {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { dark, setDark } = useTheme();

  const currentConversation = useMemo(() => conversations.find((c) => c._id === currentId), [conversations, currentId]);

  const report = useCallback((err, fallback) => {
    console.error(fallback, err);
    setError(getErrorMessage(err, fallback));
  }, []);

  const signOut = useCallback(() => {
    removeStoredItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setConversations([]);
    setMessages([]);
    setCurrentId('');
  }, []);

  useEffect(
    () =>
      onAuthExpired(() => {
        signOut();
        setError('Your session expired. Please sign in again.');
      }),
    [signOut]
  );

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/conversations');
    const items = data.conversations ?? [];
    setConversations(items);
    return items;
  }, []);

  const loadMessages = useCallback(async (id) => {
    const { data } = await api.get(`/conversations/${id}/messages`);
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) setUser(data.user);
      } catch (err) {
        if (!cancelled) report(err, 'Could not load your profile.');
      }

      try {
        const items = await loadConversations();
        if (!cancelled && items[0]) setCurrentId((prev) => prev || items[0]._id);
      } catch (err) {
        if (!cancelled) report(err, 'Could not load your conversations.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, loadConversations, report]);

  useEffect(() => {
    if (!currentId) return;

    let cancelled = false;
    loadMessages(currentId).catch((err) => {
      if (!cancelled) report(err, 'Could not load messages for this conversation.');
    });

    return () => {
      cancelled = true;
    };
  }, [currentId, loadMessages, report]);

  const onAuth = async (mode, payload) => {
    const path = mode === 'signup' ? '/auth/signup' : mode === 'signin' ? '/auth/signin' : '/auth/google';
    const { data } = await api.post(path, payload);
    if (!data?.token) throw new Error('The server did not return an auth token.');
    setStoredItem(AUTH_TOKEN_KEY, data.token);
    setError('');
    setToken(data.token);
  };

  const createConversation = async () => {
    try {
      const { data } = await api.post('/conversations', { title: 'New conversation' });
      setConversations((prev) => [data.conversation, ...prev]);
      setCurrentId(data.conversation._id);
      return data.conversation._id;
    } catch (err) {
      report(err, 'Could not create a new conversation.');
      return null;
    }
  };

  const renameConversation = async (conv) => {
    const title = prompt('Rename conversation', conv.title);
    if (!title?.trim()) return;
    try {
      const { data } = await api.patch(`/conversations/${conv._id}`, { title: title.trim() });
      setConversations((prev) => prev.map((c) => (c._id === conv._id ? data.conversation : c)));
    } catch (err) {
      report(err, 'Could not rename the conversation.');
    }
  };

  const deleteConversation = async (id) => {
    try {
      await api.delete(`/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (currentId === id) {
        setCurrentId('');
        setMessages([]);
      }
    } catch (err) {
      report(err, 'Could not delete the conversation.');
    }
  };

  const streamAssistantReply = async (convId, content, onToken) => {
    const response = await fetch(`${API_BASE_URL}/conversations/${convId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readStoredToken() ?? ''}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {
        // Non-JSON error body; keep the status-based message.
      }
      throw new Error(message);
    }
    if (!response.body) throw new Error('Streaming is not supported by this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamedError = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;

        let payload;
        try {
          payload = JSON.parse(line.slice(6));
        } catch (err) {
          // A single malformed frame should not abort an otherwise valid stream.
          console.warn('Skipping unparsable SSE frame', line, err);
          continue;
        }

        if (typeof payload.error === 'string') streamedError = new Error(payload.error);
        if (payload.token) onToken(payload.token);
      }
    }

    if (streamedError) throw streamedError;
  };

  const sendMessage = async (content) => {
    const convId = currentId || (await createConversation());
    if (!convId) throw new Error('No conversation available to send the message to.');

    const userMessage = { role: 'user', content, _id: `tmp-user-${Date.now()}` };
    const aiMessageId = `tmp-ai-${Date.now()}`;
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '', _id: aiMessageId }]);
    setError('');
    setLoading(true);

    const appendToken = (chunk) =>
      setMessages((prev) =>
        prev.map((m) => (m._id === aiMessageId ? { ...m, content: m.content + chunk } : m))
      );

    try {
      await streamAssistantReply(convId, content, appendToken);
    } catch (err) {
      report(err, 'The assistant could not respond.');
      setMessages((prev) => prev.filter((m) => !(m._id === aiMessageId && !m.content)));
      throw err;
    } finally {
      setLoading(false);
      // Re-sync with the server even after a failure: a partial reply may be stored.
      try {
        await loadConversations();
        await loadMessages(convId);
      } catch (err) {
        console.warn('Could not refresh conversation after streaming', err);
      }
    }
  };

  const regenerate = async () => {
    if (!currentId) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      setError('There is no message to regenerate yet.');
      return;
    }

    try {
      await api.post(`/conversations/${currentId}/regenerate`);
    } catch (err) {
      report(err, 'Could not prepare the conversation for regeneration.');
      return;
    }

    try {
      await sendMessage(lastUser.content);
    } catch {
      // sendMessage already surfaced the failure.
    }
  };

  const shareCurrent = async () => {
    if (!currentId) return;
    try {
      const { data } = await api.post(`/conversations/${currentId}/share`);
      const link = `${window.location.origin}/shared/${data.sharedToken}`;
      try {
        await navigator.clipboard.writeText(link);
        setNotice('Share link copied to clipboard.');
      } catch (clipboardErr) {
        console.warn('Clipboard write failed', clipboardErr);
        setNotice(`Share link: ${link}`);
      }
    } catch (err) {
      report(err, 'Could not create a share link.');
    }
  };

  const exportCurrent = async (format) => {
    if (!currentId) {
      setError('Select a conversation before exporting.');
      return;
    }

    let url;
    try {
      const res = await fetch(`${API_BASE_URL}/conversations/${currentId}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${readStoredToken() ?? ''}` }
      });
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`);

      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentConversation?.title || 'conversation'}.${format}`;
      a.click();
    } catch (err) {
      report(err, 'Could not export this conversation.');
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const copyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setNotice('Message copied.');
    } catch (err) {
      console.warn('Clipboard write failed', err);
      setError('Copying is blocked by your browser. Select the text and copy manually.');
    }
  };

  if (!token) return <AuthPanel onAuth={onAuth} />;

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 dark">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={setCurrentId}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        onOpenSettings={() => setShowSettings(true)}
      />
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 p-3">
          <div>
            <h1 className="font-semibold">{currentConversation?.title || 'ChatGPT Clone'}</h1>
            <p className="text-xs text-slate-400">Logged in as {user?.email ?? 'unknown user'}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => setDark((d) => !d)} className="rounded bg-slate-800 p-2">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={regenerate} className="rounded bg-slate-800 p-2"><RefreshCw size={16} /></button>
            <button onClick={shareCurrent} className="rounded bg-slate-800 p-2"><Share2 size={16} /></button>
            <button onClick={() => exportCurrent('json')} className="rounded bg-slate-800 px-2">Export JSON</button>
            <button onClick={() => exportCurrent('md')} className="rounded bg-slate-800 px-2">Export MD</button>
          </div>
        </header>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {notice && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200">
            <span>{notice}</span>
            <button className="text-xs uppercase text-slate-400" onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}
        <section className="flex-1 overflow-y-auto">
          {messages.map((m) => (
            <MessageItem key={m._id} message={m} onCopy={copyMessage} />
          ))}
          {loading && <div className="p-4 text-center text-sm text-slate-400">AI is typing…</div>}
        </section>
        <ChatComposer onSend={sendMessage} disabled={loading} />
      </main>
      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  );
}
