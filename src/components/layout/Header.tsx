'use client';

import { useState } from 'react';
import { useAthlete } from '@/hooks/useAthlete';
import { ThemeToggle } from './ThemeToggle';
import { showToast } from '@/components/ui/Toast';
import { useActivities } from '@/hooks/useActivities';

export function Header() {
  const { athlete } = useAthlete();
  const { refresh, deepRefresh, isSyncing, lastSyncLabel, cachedCount } = useActivities();
  const [deepSyncClicks, setDeepSyncClicks] = useState(0);

  const handleSync = async () => {
    try {
      const count = await refresh();
      if (count === 0) showToast('Nessuna nuova attivita', 'success');
      else if (count && count > 0) showToast(`${count} nuove attivita caricate!`, 'success');
      else showToast('Dati aggiornati!', 'success');
    } catch {
      showToast('Errore sincronizzazione', 'error');
    }
  };

  const handleDeepSync = async () => {
    if (deepSyncClicks < 2) {
      setDeepSyncClicks(deepSyncClicks + 1);
      showToast(`Clicca ancora ${3 - deepSyncClicks - 1} volta per deep sync`, '');
      setTimeout(() => setDeepSyncClicks(0), 3000);
      return;
    }
    setDeepSyncClicks(0);
    showToast('Deep sync in corso... Ricaricamento completo', '');
    await deepRefresh();
    showToast('Deep sync completato!', 'success');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border sticky top-0 bg-bg/90 backdrop-blur-md z-[100]">
      <div className="flex items-center gap-4">
        <div
          className="font-display text-2xl tracking-wide bg-gradient-to-br from-accent to-accent2 bg-clip-text text-transparent cursor-pointer"
          onClick={handleDeepSync}
          title="Triple-click per deep sync"
        >
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
        {/* Sync info */}
        <div className="hidden sm:flex flex-col items-end mr-1">
          <span className="text-[0.6rem] text-muted font-mono">{cachedCount} attivita</span>
          {lastSyncLabel && (
            <span className="text-[0.55rem] text-muted/50 font-mono">sync: {lastSyncLabel}</span>
          )}
        </div>
        <ThemeToggle />
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-surface2 border border-border text-text px-3 py-1.5 rounded-lg text-xs cursor-pointer font-sans transition-all hover:border-accent hover:text-accent flex items-center gap-1.5 disabled:opacity-50"
        >
          <span className={isSyncing ? 'animate-spin' : ''}>&#8635;</span>
          {isSyncing ? 'Sync...' : 'Sync'}
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
