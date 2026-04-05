'use client';

import { useAthlete } from '@/hooks/useAthlete';
import { ThemeToggle } from './ThemeToggle';
import { showToast } from '@/components/ui/Toast';
import { useActivities } from '@/hooks/useActivities';

export function Header() {
  const { athlete } = useAthlete();
  const { refresh } = useActivities();

  const handleSync = async () => {
    try {
      await refresh();
      showToast('Dati aggiornati!', 'success');
    } catch {
      showToast('Errore sincronizzazione', 'error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur-md z-[100]">
      <div className="flex items-center gap-4">
        <div className="font-display text-2xl tracking-wide bg-gradient-to-br from-accent to-accent2 bg-clip-text text-transparent">
          42K
        </div>
        {athlete && (
          <div className="flex items-center gap-2">
            {athlete.profile && (
              <img
                src={athlete.profile}
                alt={athlete.firstname}
                className="w-8 h-8 rounded-full border-2 border-accent object-cover"
              />
            )}
            <span className="text-sm font-medium">
              {athlete.firstname} {athlete.lastname}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <ThemeToggle />
        <button
          onClick={handleSync}
          className="bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans transition-all hover:border-accent hover:text-accent flex items-center gap-1.5"
        >
          <span>&#8635;</span> Sincronizza
        </button>
        <button
          onClick={handleLogout}
          className="bg-surface2 border border-border text-muted px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans transition-all hover:border-accent hover:text-accent"
        >
          Esci
        </button>
      </div>
    </header>
  );
}
