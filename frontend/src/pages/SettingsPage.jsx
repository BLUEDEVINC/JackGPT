export function SettingsPage({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 p-6">
      <div className="mx-auto max-w-lg rounded bg-slate-900 p-6 text-slate-100">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-2 text-sm text-slate-300">Manage account, theme, and app preferences.</p>
        <button className="mt-4 rounded bg-slate-700 px-4 py-2" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
