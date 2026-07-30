import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { MessageItem } from '../components/MessageItem';
import { useTheme } from '../hooks/useTheme';

export function SharedConversationPage() {
  const { token } = useParams();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  useTheme();

  useEffect(() => {
    api
      .get(`/shared/${token}`)
      .then(({ data }) => {
        setConversation(data.conversation);
        setMessages(data.messages);
      })
      .catch((err) => setError(errorMessage(err, 'This shared conversation is not available.')));
  }, [token]);

  return (
    <div className="min-h-full bg-canvas text-fg">
      <header className="border-b border-line bg-panel p-3">
        <h1 className="mx-auto max-w-3xl font-semibold">{conversation?.title || 'Shared conversation'}</h1>
      </header>
      {error ? (
        <p role="alert" className="mx-auto max-w-3xl p-4 text-sm text-red-400">
          {error}
        </p>
      ) : (
        messages.map((m) => <MessageItem key={m._id} message={m} onCopy={(c) => navigator.clipboard?.writeText(c)} />)
      )}
    </div>
  );
}
