export function SettingsPage({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 p-6" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="mx-auto max-w-lg rounded bg-panel p-6 text-fg">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-2 text-sm text-muted">Manage account, theme, and app preferences.</p>
        <button className="mt-4 rounded bg-surface px-4 py-2" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
