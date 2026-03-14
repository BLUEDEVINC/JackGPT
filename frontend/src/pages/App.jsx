import { useEffect, useMemo, useState } from 'react';
import { Moon, RefreshCw, Share2, Sun } from 'lucide-react';
import api from '../lib/api';
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
  const [showSettings, setShowSettings] = useState(false);
  const { dark, setDark } = useTheme();

  const currentConversation = useMemo(() => conversations.find((c) => c._id === currentId), [conversations, currentId]);

  const loadConversations = async () => {
    const { data } = await api.get('/conversations');
    setConversations(data.conversations);
    if (!currentId && data.conversations[0]) setCurrentId(data.conversations[0]._id);
  };

  const loadMessages = async (id) => {
    const { data } = await api.get(`/conversations/${id}/messages`);
    setMessages(data.messages);
  };

  useEffect(() => {
    if (!token) return;
    api.get('/auth/me').then(({ data }) => setUser(data.user));
    loadConversations();
  }, [token]);

  useEffect(() => {
    if (currentId) loadMessages(currentId);
  }, [currentId]);

  const onAuth = async (mode, payload) => {
    const path = mode === 'signup' ? '/auth/signup' : mode === 'signin' ? '/auth/signin' : '/auth/google';
    const { data } = await api.post(path, payload);
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
  };

  const createConversation = async () => {
    const { data } = await api.post('/conversations', { title: 'New conversation' });
    setConversations((prev) => [data.conversation, ...prev]);
    setCurrentId(data.conversation._id);
  };

  const renameConversation = async (conv) => {
    const title = prompt('Rename conversation', conv.title);
    if (!title) return;
    const { data } = await api.patch(`/conversations/${conv._id}`, { title });
    setConversations((prev) => prev.map((c) => (c._id === conv._id ? data.conversation : c)));
  };

  const deleteConversation = async (id) => {
    await api.delete(`/conversations/${id}`);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (currentId === id) setCurrentId('');
  };

  const sendMessage = async (content) => {
    if (!currentId) await createConversation();
    const convId = currentId || conversations[0]?._id;
    setLoading(true);

    const userMessage = { role: 'user', content, _id: `tmp-user-${Date.now()}` };
    const aiMessage = { role: 'assistant', content: '', _id: `tmp-ai-${Date.now()}` };
    setMessages((prev) => [...prev, userMessage, aiMessage]);

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/conversations/${convId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ content })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        if (!event.startsWith('data: ')) continue;
        const payload = JSON.parse(event.slice(6));
        if (payload.token) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + payload.token };
            return copy;
          });
        }
      }
    }

    setLoading(false);
    await loadConversations();
    if (convId) await loadMessages(convId);
  };

  const regenerate = async () => {
    if (!currentId) return;
    await api.post(`/conversations/${currentId}/regenerate`);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) await sendMessage(lastUser.content);
  };

  const shareCurrent = async () => {
    if (!currentId) return;
    const { data } = await api.post(`/conversations/${currentId}/share`);
    navigator.clipboard.writeText(`${window.location.origin}/shared/${data.sharedToken}`);
    alert('Share link copied to clipboard');
  };

  const exportCurrent = async (format) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/conversations/${currentId}/export?format=${format}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
    });
    const text = await res.text();
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentConversation?.title || 'conversation'}.${format}`;
    a.click();
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
            <p className="text-xs text-slate-400">Logged in as {user?.email}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => setDark((d) => !d)} className="rounded bg-slate-800 p-2">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={regenerate} className="rounded bg-slate-800 p-2"><RefreshCw size={16} /></button>
            <button onClick={shareCurrent} className="rounded bg-slate-800 p-2"><Share2 size={16} /></button>
            <button onClick={() => exportCurrent('json')} className="rounded bg-slate-800 px-2">Export JSON</button>
            <button onClick={() => exportCurrent('md')} className="rounded bg-slate-800 px-2">Export MD</button>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto">
          {messages.map((m) => (
            <MessageItem key={m._id} message={m} onCopy={(c) => navigator.clipboard.writeText(c)} />
          ))}
          {loading && <div className="p-4 text-center text-sm text-slate-400">AI is typing…</div>}
        </section>
        <ChatComposer onSend={sendMessage} disabled={loading} />
      </main>
      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
    </div>
  );
}
