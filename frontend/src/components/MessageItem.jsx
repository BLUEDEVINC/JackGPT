import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  highlight(code, lang) {
    try {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
      return hljs.highlightAuto(code).value;
    } catch (err) {
      console.warn('Syntax highlighting failed', err);
      return code;
    }
  }
});

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function MessageItem({ message, onCopy }) {
  const content = message.content || '';

  const html = useMemo(() => {
    try {
      return DOMPurify.sanitize(marked.parse(content));
    } catch (err) {
      // Never let malformed markdown take the whole conversation down.
      console.error('Failed to render markdown; falling back to plain text', err);
      return `<pre class="whitespace-pre-wrap">${escapeHtml(content)}</pre>`;
    }
  }, [content]);

  const copy = async () => {
    try {
      await onCopy(content);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className={`w-full p-4 ${message.role === 'assistant' ? 'bg-slate-800' : 'bg-slate-900'}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 text-xs uppercase text-slate-400">{message.role}</div>
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        <button className="mt-2 text-xs text-slate-400" onClick={copy}>Copy</button>
      </div>
    </div>
  );
}
