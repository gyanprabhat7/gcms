'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded bg-opacity-20 hover:bg-opacity-30 transition-colors border border-transparent hover:border-primary/50 group"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-primary group-hover:text-primary-fg transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-primary group-hover:text-primary-fg transition-colors" />
      )}
    </button>
  );
}
