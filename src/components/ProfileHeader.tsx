'use client';

import { useState, useEffect } from 'react';
import { Participant, Badge } from '@/lib/db';
import { ExternalLinkIcon, ExitIcon, UpdateIcon, GearIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface ProfileHeaderProps {
  participant: Participant;
  badges: Badge[];
  onResetSession: () => void;
  onSync?: () => Promise<void>;
  onOpenNotifications?: () => void;
  latestNotifId?: string;
}

export default function ProfileHeader({ participant, badges, onResetSession, onSync, onOpenNotifications, latestNotifId }: ProfileHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (latestNotifId) {
      const lastRead = localStorage.getItem('arcade_notif_last_read');
      if (lastRead !== latestNotifId) {
        setHasUnread(true);
      }
    }
  }, [latestNotifId]);

  const activeMonthName = 'Juli 2026';
  const activeMonthPrefix = '2026-07';
  const activePeriodStart = '2026-07-13';

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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold font-mono">
              Profil Peserta
            </span>
            {participant.role === 'facilitator' && (
              <span className="text-[10px] uppercase tracking-wider bg-tertiary text-white border-[2.5px] border-black px-2 py-0.5 font-black shadow-[2px_2px_0px_#000] rounded">
                Fasilitator
              </span>
            )}
          </div>
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
          <div className="space-y-2.5 text-text-muted font-bold">
            <div className="flex items-center md:justify-end">
              <a
                href="https://zeff.my.id/feedback-tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary uppercase tracking-widest bg-zinc-300 border-[2px] border-black px-2 py-0.5 text-[9px] font-black shadow-[1px_1px_0px_#000] hover:bg-zinc-200 hover:-translate-y-0.5 transition-all inline-block"
              >
                Report & Feedback
              </a>
            </div>
            <div>Periode: <span className="text-black">{activeMonthName}</span></div>
          </div>

          <div className="flex items-center gap-2 md:justify-end">
            {participant.role === 'facilitator' && (
              <Link
                href="/panel"
                className="order-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-black bg-primary hover:bg-yellow-400 border-[3px] border-black rounded-lg px-3 py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]"
              >
                <GearIcon className="w-3 h-3" />
                <span>Panel Fasil</span>
              </Link>
            )}
            {onSync && (

              <button
                onClick={handleSync}
                disabled={isSyncing}
                title="Sinkronkan profil saya"
                className="order-1 md:order-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-white bg-secondary hover:bg-secondary-dark border-[3px] border-black rounded-lg px-3 py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] disabled:opacity-50"
              >
                <UpdateIcon className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
              </button>
            )}
            <button
              onClick={onResetSession}
              className="absolute top-4 right-4 md:static md:order-3 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-black bg-white hover:bg-secondary hover:text-white border-[3px] border-black rounded-lg px-2.5 py-1.5 md:px-3 md:py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]"
            >
              <ExitIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Keluar Sesi</span>
              <span className="inline sm:hidden">Keluar</span>
            </button>
            <button
              onClick={() => {
                onOpenNotifications?.();
                setHasUnread(false);
                if (latestNotifId) {
                  localStorage.setItem('arcade_notif_last_read', latestNotifId);
                }
              }}
              title="Notifikasi Program"
              className="order-3 md:order-1 relative inline-flex items-center justify-center text-[9px] uppercase tracking-widest font-bold font-mono text-black bg-primary hover:bg-yellow-400 border-[3px] border-black rounded-lg w-8 h-8 md:w-auto md:px-3 md:py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 md:mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <span className="hidden md:inline">Notif</span>
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-secondary rounded-full border-[2px] border-black shadow-[1px_1px_0px_#000]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
