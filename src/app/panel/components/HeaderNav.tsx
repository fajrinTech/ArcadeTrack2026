'use client';

import Link from 'next/link';
import { ArrowLeftIcon, UpdateIcon, DownloadIcon, UploadIcon, EnvelopeClosedIcon } from '@radix-ui/react-icons';
import React from 'react';
import { createPortal } from 'react-dom';

interface HeaderNavProps {
  facilName: string;
  hasParticipants: boolean;
  isSyncingAll: boolean;
  syncProgress: { current: number; total: number };
  syncingId: string | null;
  isImporting: boolean;
  onSyncAll: () => void;
  onExportCSV: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  systemLock?: { locked: boolean; by?: string };
  onSendEmailProgress: () => void;
  isSendingEmail: boolean;
  showEmailProgress?: boolean;
}

export default function HeaderNav({
  facilName,
  hasParticipants,
  isSyncingAll,
  syncProgress,
  syncingId,
  isImporting,
  onSyncAll,
  onExportCSV,
  onFileUpload,
  fileInputRef,
  systemLock,
  onSendEmailProgress,
  isSendingEmail,
  showEmailProgress
}: HeaderNavProps) {
  const isSystemLocked = systemLock?.locked && systemLock?.by === 'Mentor Utama';
  const [showChangelog, setShowChangelog] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const changelogs = [
    {
      version: 'v1.4.7',
      date: '21 Jul 2026',
      changes: [
        'Menambahkan tab "Masukan & Bug" real-time dari Google Sheet.',
        'Sistem layout tabel feedback ter-truncate dengan detail pembaca pop-up modal.',
        'Menambahkan fitur Rollback batch CSV, Audit Log, dan Mode Pemeliharaan (Maintenance).'
      ]
    },
    {
      version: 'v1.4.6',
      date: '21 Jul 2026',
      changes: [
        'Optimasi bypass scraper IP public rate-limit secara internal.',
        'Menerapkan sequential delay 500ms dan retry sync otomatis untuk ketahanan tinggi.'
      ]
    },
    {
      version: 'v1.4.5',
      date: '21 Jul 2026',
      changes: [
        'Pemberlakuan auto-logout & pembersihan sesi lama untuk keamanan data.',
        'Mencegah freeze/layar blank saat cookie sesi kedaluwarsa.'
      ]
    }
  ];

  return (
    <div className="relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000] animate-fade-slide-up">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 border-[2.5px] border-black rounded bg-white hover:bg-surface-alt active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] shadow-[3px_3px_0px_#000] transition-all"
          title="Kembali ke Dashboard"
        >
          <ArrowLeftIcon className="w-4 h-4 text-black" />
        </Link>
        <div>
          <h1 className="text-lg font-black uppercase text-black flex items-center gap-2">
            Panel Fasilitator
            <button
              onClick={() => setShowChangelog(true)}
              className="text-[9px] px-1.5 py-0.5 bg-primary text-black border-[1.5px] border-black rounded shadow-[1px_1px_0_#000] hover:bg-primary-dark transition-colors font-bold uppercase tracking-wider"
              title="Lihat Log Pembaruan"
            >
              v1.4.7 ℹ
            </button>
          </h1>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
            Fasil: {facilName || 'Google Cloud Facilitator'}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
        {hasParticipants && (
          <button
            onClick={onSyncAll}
            disabled={isSyncingAll || syncingId !== null || isImporting || isSystemLocked}
            className={`neobrutal-btn-secondary ${isSystemLocked ? '!bg-zinc-400 cursor-not-allowed' : '!bg-secondary hover:!bg-secondary-dark'} flex items-center gap-1.5 !py-2 !px-3 text-xs font-bold text-white shadow-[3px_3px_0px_#000] border-[2.5px] border-black rounded transition-all active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] disabled:opacity-50 w-full sm:w-auto justify-center whitespace-nowrap`}
          >
            <UpdateIcon className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            {isSystemLocked ? (
              <span>System sync</span>
            ) : isSyncingAll ? (
              <span>SYNC ({syncProgress.current}/{syncProgress.total})</span>
            ) : (
              <>
                <span className="hidden sm:inline">SYNC SEMUA</span>
                <span className="inline sm:hidden">SYNC ALL</span>
              </>
            )}
          </button>
        )}

        {hasParticipants && showEmailProgress && (
          <button
            onClick={onSendEmailProgress}
            disabled={isSyncingAll || syncingId !== null || isImporting || isSendingEmail}
            className="neobrutal-btn-secondary !bg-[#E1EFFE] !text-[#1E429F] hover:!bg-[#C3DDFD] flex items-center gap-1.5 !py-2 !px-3 text-xs font-bold shadow-[3px_3px_0px_#000] border-[2.5px] border-black rounded transition-all active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] disabled:opacity-50 w-full sm:w-auto justify-center whitespace-nowrap"
          >
            <EnvelopeClosedIcon className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-pulse' : ''}`} />
            <span>{isSendingEmail ? 'KIRIM...' : 'EMAIL PROGRES'}</span>
          </button>
        )}

        {hasParticipants && (
          <button
            onClick={onExportCSV}
            disabled={isSyncingAll || syncingId !== null || isImporting}
            className="neobrutal-btn-secondary !bg-[#4CAF50] hover:!bg-[#388E3C] !text-white flex items-center gap-1.5 !py-2 !px-3 text-xs font-bold shadow-[3px_3px_0px_#000] border-[2.5px] border-black rounded transition-all active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] disabled:opacity-50 w-full sm:w-auto justify-center whitespace-nowrap"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>EXPORT</span>
          </button>
        )}

        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={onFileUpload}
          className="hidden"
          id="csv-file-upload"
        />
        <label
          htmlFor="csv-file-upload"
          className="neobrutal-btn-primary flex items-center gap-1.5 cursor-pointer justify-center w-full sm:w-auto !py-2 !px-3 text-xs font-bold shadow-[3px_3px_0px_#000] border-[2.5px] border-black rounded transition-all active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] whitespace-nowrap"
        >
          <UploadIcon className="w-3.5 h-3.5" />
          <span>UPLOAD CSV</span>
        </label>
      </div>

      {/* Changelog Modal */}
      {showChangelog && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="neobrutal-card max-w-md w-full p-6 space-y-4 animate-scale-in text-black bg-white">
            <div className="flex justify-between items-center border-b-[2.5px] border-black pb-2.5">
              <h3 className="font-black uppercase text-sm">Changelog Sistem</h3>
              <button
                onClick={() => setShowChangelog(false)}
                className="p-1 border-[2.5px] border-black rounded bg-white hover:bg-surface-alt active:translate-x-[0.5px] active:translate-y-[0.5px] text-xs font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
              {changelogs.map((log) => (
                <div key={log.version} className="border-[2px] border-black p-3 bg-surface-alt rounded">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="px-2 py-0.5 bg-primary border-[1.5px] border-black rounded text-[10px] font-black">{log.version}</span>
                    <span className="text-[10px] text-text-muted font-bold">{log.date}</span>
                  </div>
                  <ul className="list-disc pl-4 text-xs font-bold space-y-1 text-black">
                    {log.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t-[2px] border-black">
              <button
                onClick={() => setShowChangelog(false)}
                className="neobrutal-btn-primary text-xs font-bold !py-1.5 !px-3 shadow-[2.5px_2.5px_0_#000] border-[2px] border-black rounded active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
