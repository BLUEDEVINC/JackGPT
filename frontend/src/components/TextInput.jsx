export function TextInput({ className = '', ...props }) {
  return <input className={`w-full rounded bg-surface p-2 ${className}`.trim()} {...props} />;
}
