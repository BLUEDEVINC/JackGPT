export function TextInput({ className = '', ...props }) {
  return <input className={`w-full rounded bg-slate-800 p-2 ${className}`.trim()} {...props} />;
}
