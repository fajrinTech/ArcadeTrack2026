'use client';

import { useEffect, useState } from 'react';
import { TargetIcon, UpdateIcon } from '@radix-ui/react-icons';

interface HeaderProps {
  currentView: 'dashboard' | 'leaderboard';
  onViewChange: (view: 'dashboard' | 'leaderboard') => void;
  isLoggedIn: boolean;
  onSyncSelf?: () => Promise<void>;
}

export default function Header({ currentView, onViewChange, isLoggedIn, onSyncSelf }: HeaderProps) {
  const [time, setTime] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncSelf || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSyncSelf();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full border-b-[3px] border-black bg-white relative z-50 font-mono py-4 px-6 shadow-[0_4px_0_#000]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center border-[3px] border-black shadow-[3px_3px_0px_#000]">
            <TargetIcon className="w-5 h-5 text-black" />
          </div>
          <span className="text-black font-extrabold uppercase tracking-widest text-sm" style={{ fontFamily: 'var(--font-sans)' }}>
            Arcade Tracker <span className="text-secondary">2026</span>
          </span>
        </div>

        {/* Nav Switcher */}
        {isLoggedIn && (
          <nav className="flex items-center gap-1 bg-surface-alt p-1 border-[3px] border-black rounded-lg shadow-[3px_3px_0px_#000]">
            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-5 py-2 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'bg-primary text-black border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                  : 'text-text-muted hover:text-black hover:bg-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onViewChange('leaderboard')}
              className={`px-5 py-2 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 ${
                currentView === 'leaderboard'
                  ? 'bg-tertiary text-white border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                  : 'text-text-muted hover:text-black hover:bg-white'
              }`}
            >
              Leaderboard
            </button>
          </nav>
        )}

        <div className="flex items-center gap-6">
          {/* Clock */}
          <div className="hidden sm:block font-mono text-text-muted text-[10px]">
            SYS TIME: <span className="text-black font-bold">{time || 'YYYY-MM-DD HH:MM:SS'}</span>
          </div>

          {/* Sync own profile */}
          {isLoggedIn && onSyncSelf && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              title="Sinkronkan profil saya"
              className="flex items-center gap-1.5 px-3 py-1.5 border-[3px] border-black bg-secondary text-white font-bold uppercase tracking-wider text-[10px] rounded-md shadow-[2px_2px_0px_#000] transition-all hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] disabled:opacity-50"
            >
              <UpdateIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing' : 'Sync'}</span>
            </button>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 font-bold">
            <span className="text-text-muted text-[9px] uppercase tracking-wider">STATUS:</span>
            <span className="text-black uppercase tracking-widest bg-success border-[2px] border-black px-3 py-1 font-mono text-[9px] font-bold shadow-[2px_2px_0px_#000]">
              ONLINE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
