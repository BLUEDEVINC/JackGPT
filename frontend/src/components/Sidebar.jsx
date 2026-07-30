import { Pencil, Plus, Settings, Trash2 } from 'lucide-react';

export function Sidebar({ conversations, currentId, onSelect, onCreate, onDelete, onRename, onOpenSettings }) {
  return (
    <aside className="flex w-72 flex-col border-r border-line bg-panel p-3">
      <button onClick={onCreate} className="mb-3 flex w-full items-center gap-2 rounded bg-surface p-2">
        <Plus size={16} /> New chat
      </button>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {conversations.map((c) => (
          <div key={c._id} className={`rounded p-2 ${currentId === c._id ? 'bg-line' : 'bg-surface'}`}>
            <button className="w-full truncate text-left" onClick={() => onSelect(c._id)}>
              {c.title}
            </button>
            <div className="mt-1 flex gap-3 text-xs text-muted">
              <button onClick={() => onRename(c)} aria-label={`Rename ${c.title}`} title="Rename">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(c._id)} aria-label={`Delete ${c.title}`} title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 flex items-center gap-2 text-sm text-muted" onClick={onOpenSettings}>
        <Settings size={15} /> Settings
      </button>
    </aside>
  );
}
