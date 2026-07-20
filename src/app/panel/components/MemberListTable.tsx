'use client';

import React from 'react';
import { UpdateIcon, TrashIcon, EnvelopeClosedIcon } from '@radix-ui/react-icons';

interface FacilitatorMember {
  id: string;
  name: string;
  profile_url: string;
  games_count: number;
  skills_count: number;
  monthly_points: number;
  last_synced?: string | null;
}

interface MemberListTableProps {
  loadingList: boolean;
  totalBimbingan: number;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filteredParticipants: FacilitatorMember[];
  displayedParticipants: FacilitatorMember[];
  visibleCount: number;
  onLoadMore: () => void;
  syncingId: string | null;
  onSyncParticipant: (id: string) => void;
  onDeleteParticipant: (id: string, name: string) => void;
  showEmailProgress?: boolean;
  onSendEmailSingle?: (id: string, name: string) => void;
  sendingEmailId?: string | null;
}

export default function MemberListTable({
  loadingList,
  totalBimbingan,
  searchQuery,
  onSearchChange,
  filteredParticipants,
  displayedParticipants,
  visibleCount,
  onLoadMore,
  syncingId,
  onSyncParticipant,
  onDeleteParticipant,
  showEmailProgress,
  onSendEmailSingle,
  sendingEmailId
}: MemberListTableProps) {
  return (
    <div className="neobrutal-card space-y-4 animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-[2px] border-black pb-3">
        <span className="text-xs font-black uppercase text-black">
          Daftar Progres Peserta Bimbingan
        </span>
        {totalBimbingan > 0 && (
          <input
            type="text"
            placeholder="Cari nama peserta..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="neobrutal-input text-xs max-w-xs w-full py-1.5 px-3"
          />
        )}
      </div>

      {loadingList ? (
        <div className="py-12 text-center text-xs text-text-muted">
          <UpdateIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
          <span>MEMUAT DATA PESERTA...</span>
        </div>
      ) : totalBimbingan === 0 ? (
        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 border-[3px] border-dashed border-zinc-400 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-black uppercase">Belum ada data bimbingan</p>
            <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
              Silakan upload file CSV dari email Arcade Global menggunakan tombol di atas untuk melihat progres peserta bimbingan Anda.
            </p>
          </div>
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          TIDAK ADA DATA PESERTA YANG COCOK
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-[3px] border-black text-text-muted uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-2 text-center w-10">#</th>
                  <th className="py-2.5 px-2">NAMA PESERTA</th>
                  <th className="py-2.5 px-2 hidden sm:table-cell">PROFILE URL</th>
                  <th className="py-2.5 px-2 text-center w-28">POIN ARCADE</th>
                  <th className="py-2.5 px-2 text-center w-36 hidden sm:table-cell">SYNC TERAKHIR</th>
                  <th className="py-2.5 px-2 text-center w-24">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y-[2px] divide-black text-black">
                {displayedParticipants.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-surface-alt transition-colors">
                    <td className="py-3 px-2 text-center font-bold text-text-muted">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2 font-extrabold">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[8px] text-text-muted sm:hidden mt-0.5 font-bold uppercase">
                          Sync: {p.last_synced
                            ? new Date(p.last_synced).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Belum'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 hidden sm:table-cell text-text-muted truncate max-w-[200px]" title={p.profile_url}>
                      <a
                        href={p.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-tertiary hover:underline"
                      >
                        {p.profile_url}
                      </a>
                    </td>
                    <td className="py-3 px-2 text-center font-black text-sm">
                      {(p.monthly_points ?? 0).toFixed(1)}
                      <div className="text-[8px] text-text-muted font-bold mt-0.5">
                        {p.games_count} G / {p.skills_count} S
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-[10px] text-text-muted hidden sm:table-cell">
                      {p.last_synced
                        ? new Date(p.last_synced).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Belum Sinkron'
                      }
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSyncParticipant(p.id)}
                          disabled={syncingId !== null || sendingEmailId !== null}
                          className="p-1.5 border-[2px] border-black rounded bg-white hover:bg-tertiary hover:text-white shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50"
                          title="Scrape & Sinkronisasi"
                        >
                          {syncingId === p.id ? (
                            <UpdateIcon className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                            </svg>
                          )}
                        </button>
                        {showEmailProgress && onSendEmailSingle ? (
                          <button
                            onClick={() => onSendEmailSingle(p.id, p.name)}
                            disabled={syncingId !== null || sendingEmailId !== null}
                            className="p-1.5 border-[2px] border-black rounded bg-white hover:bg-[#E1EFFE] hover:text-[#1E429F] shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50"
                            title="Kirim Email Progres"
                          >
                            {sendingEmailId === p.id ? (
                              <UpdateIcon className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <EnvelopeClosedIcon className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => onDeleteParticipant(p.id, p.name)}
                            disabled={syncingId !== null}
                            className="p-1.5 border-[2px] border-black rounded bg-white hover:bg-secondary hover:text-white shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50"
                            title="Hapus Peserta"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredParticipants.length > visibleCount && (
            <div className="pt-3.5 flex justify-center border-t-[2px] border-black">
              <button
                onClick={onLoadMore}
                className="px-4 py-2 border-[2.5px] border-black rounded text-xs font-bold bg-white hover:bg-surface-alt active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] shadow-[2.5px_2.5px_0px_#000] transition-all"
              >
                MUAT 100 PESERTA LAGI ({filteredParticipants.length - visibleCount} TERSISA)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
