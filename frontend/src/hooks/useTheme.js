import { useEffect, useState } from 'react';
import { getStoredItem, setStoredItem } from '../lib/storage';

export function useTheme() {
  const [dark, setDark] = useState(() => getStoredItem('theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    setStoredItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, setDark };
}
