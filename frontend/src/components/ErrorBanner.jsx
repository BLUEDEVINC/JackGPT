export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 border-b border-red-500/50 bg-red-500/15 px-4 py-2 text-sm text-red-100"
    >
      <span>{message}</span>
      <button className="text-xs uppercase text-red-200" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
