'use client';

import { useState } from 'react';
import { Participant, Badge } from '@/lib/db';
import { ExternalLinkIcon, ExitIcon, UpdateIcon } from '@radix-ui/react-icons';

interface ProfileHeaderProps {
  participant: Participant;
  badges: Badge[];
  onResetSession: () => void;
  onSync?: () => Promise<void>;
}

export default function ProfileHeader({ participant, badges, onResetSession, onSync }: ProfileHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const activeMonthName = 'Juli 2026';
  const activeMonthPrefix = '2026-07';
  const activePeriodStart = `${activeMonthPrefix}-01`;

  const isCurrentPeriod = (b: Badge) => b.earned_date >= activePeriodStart;
  const historicalBadges = badges.filter(b => !isCurrentPeriod(b));

  const handleSync = async () => {
    if (!onSync || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="neobrutal-card animate-fade-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold font-mono">
            Profil Peserta
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight uppercase break-words" style={{ fontFamily: 'var(--font-sans)' }}>
            {participant.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-text-muted">
            <a 
              href={participant.profile_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-tertiary hover:text-secondary transition-colors font-bold uppercase font-mono text-[10px]"
            >
              <span>Lihat Profil Skills Boost</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
            {historicalBadges.length > 0 && (
              <>
                <span className="text-zinc-300 font-mono hidden sm:inline">|</span>
                <span className="font-mono text-[10px] font-bold">
                  {historicalBadges.length} badge lama diarsipkan
                </span>
              </>
            )}
          </div>
        </div>
        <div className="font-mono text-[10px] space-y-3 flex flex-col md:items-end justify-between shrink-0">
          <div className="space-y-1 text-text-muted font-bold">
            <div className="flex items-center gap-2 md:justify-end">
              <span className="uppercase tracking-wider">Status</span>
              <span className="text-black uppercase tracking-widest bg-success border-[2px] border-black px-2 py-0.5 text-[9px] font-bold shadow-[1px_1px_0px_#000]">ONLINE</span>
            </div>
            <div>Periode: <span className="text-black">{activeMonthName}</span></div>
          </div>

          <div className="flex items-center gap-2 md:justify-end">
            {onSync && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                title="Sinkronkan profil saya"
                className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-white bg-secondary hover:bg-secondary-dark border-[3px] border-black rounded-lg px-3 py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] disabled:opacity-50"
              >
                <UpdateIcon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
              </button>
            )}
            <button
              onClick={onResetSession}
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-black bg-white hover:bg-secondary hover:text-white border-[3px] border-black rounded-lg px-3 py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]"
            >
              <ExitIcon className="w-3 h-3" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
