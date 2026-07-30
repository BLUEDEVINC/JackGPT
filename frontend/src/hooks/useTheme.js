import { useEffect, useState } from 'react';

function initialDark() {
  const stored = localStorage.getItem('theme');
  if (stored) return stored !== 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

export function useTheme() {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, setDark };
}
