import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  }
});

export function MessageItem({ message, onCopy }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(message.content || '')), [message.content]);

  return (
    <div className={`w-full p-4 ${message.role === 'assistant' ? 'bg-slate-800' : 'bg-slate-900'}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 text-xs uppercase text-slate-400">{message.role}</div>
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        <button className="mt-2 text-xs text-slate-400" onClick={() => onCopy(message.content)}>Copy</button>
      </div>
    </div>
  );
}
