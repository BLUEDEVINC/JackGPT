import { Plus, Settings, Trash2 } from 'lucide-react';

export function Sidebar({ conversations, currentId, onSelect, onCreate, onDelete, onRename, onOpenSettings }) {
  return (
    <aside className="w-72 border-r border-slate-700 bg-slate-900 p-3 text-slate-100">
      <button onClick={onCreate} className="mb-3 flex w-full items-center gap-2 rounded bg-slate-800 p-2"><Plus size={16} /> New chat</button>
      <div className="space-y-2 overflow-y-auto">
        {conversations.map((c) => (
          <div key={c._id} className={`group rounded p-2 ${currentId === c._id ? 'bg-slate-700' : 'bg-slate-800'}`}>
            <button className="w-full text-left" onClick={() => onSelect(c._id)}>{c.title}</button>
            <div className="mt-1 hidden gap-2 text-xs group-hover:flex">
              <button onClick={() => onRename(c)}>Rename</button>
              <button onClick={() => onDelete(c._id)}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 flex items-center gap-2 text-sm text-slate-300" onClick={onOpenSettings}><Settings size={15} /> Settings</button>
    </aside>
  );
}
