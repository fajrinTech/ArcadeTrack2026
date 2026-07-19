'use client';

import Link from 'next/link';
import { ArrowLeftIcon, UpdateIcon, DownloadIcon, UploadIcon } from '@radix-ui/react-icons';
import React from 'react';

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
  systemLock
}: HeaderNavProps) {
  const isSystemLocked = systemLock?.locked && systemLock?.by !== facilName;

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
          <h1 className="text-lg font-black uppercase text-black">Panel Fasilitator</h1>
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
          <span>UPLOAD CSV ARCADE</span>
        </label>
      </div>
    </div>
  );
}
