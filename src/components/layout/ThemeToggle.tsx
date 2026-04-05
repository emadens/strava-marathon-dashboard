'use client';

import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = () => {
    const order = ['system', 'light', 'dark'] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]);
  };

  const icon = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐';
  const label = theme === 'light' ? 'Chiaro' : theme === 'dark' ? 'Scuro' : 'Auto';

  return (
    <button
      onClick={next}
      className="bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans transition-all hover:border-accent hover:text-accent flex items-center gap-1.5"
      title={`Tema: ${label}`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
