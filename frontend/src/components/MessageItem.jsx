import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

export function MessageItem({ message, onCopy }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(message.content || '')), [message.content]);

  return (
    <div className={`w-full p-4 ${message.role === 'assistant' ? 'bg-surface' : 'bg-panel'}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 text-xs uppercase text-muted">{message.role}</div>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
        <button className="mt-2 text-xs text-muted" onClick={() => onCopy(message.content)}>
          Copy
        </button>
      </div>
    </div>
  );
}
