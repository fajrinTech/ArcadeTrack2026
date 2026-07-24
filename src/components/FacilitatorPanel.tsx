'use client';

import { useState, useMemo, useEffect } from 'react';
import { Participant } from '@/lib/db';

interface LeaderboardPanelProps {
  participants: Participant[];
  selectedId: string | null;
  myProfileId: string | null;
  isFacilitator: boolean;
  onSelect: (id: string) => void;
}

// Deterministic background color for the initials fallback, derived from id.
const AVATAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-success', 'bg-zinc-400'];

function getInitials(name: string) {
  const parts = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) || '?';
}

function Avatar({ p, className = '', textClass = 'text-sm' }: { p: Participant; className?: string; textClass?: string }) {
  const color = AVATAR_COLORS[(p.id.charCodeAt(0) + p.id.length) % AVATAR_COLORS.length];
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border-[3px] border-black ${className}`}>
      {/* Initials background — shown when there is no photo or it fails to load */}
      <div className={`absolute inset-0 flex items-center justify-center font-extrabold text-black ${color} ${textClass}`}>
        {getInitials(p.name)}
      </div>
      {p.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.avatar_url}
          alt={p.name}
          className="relative h-full w-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : null}
    </div>
  );
}

const MEDALS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']; // gold, silver, bronze

export default function FacilitatorPanel({
  participants,
  selectedId,
  myProfileId,
  isFacilitator,
  onSelect,
}: LeaderboardPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'alltime' | 'weekly'>('alltime');

  const isAdmin = useMemo(() => {
    if (!myProfileId) return false;
    if (myProfileId === 'a3961d06-d854-4348-9977-004d5a3dd8d8') return true;
    const me = participants.find(p => p.id === myProfileId);
    return me?.profile_url === 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c';
  }, [myProfileId, participants]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 150);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const sorted = useMemo(() => {
    let list = [...participants];
    if (timeframe === 'weekly') {
      // Strictly filter only participants who earned weekly points starting July 24
      list = list.filter(p => (p.weekly_points ?? 0) > 0);
    }
    return list.sort((a, b) => {
      const ptsA = timeframe === 'weekly' ? (a.weekly_points ?? 0) : (a.monthly_points ?? 0);
      const ptsB = timeframe === 'weekly' ? (b.weekly_points ?? 0) : (b.monthly_points ?? 0);
      return ptsB - ptsA;
    });
  }, [participants, timeframe]);

  const top3 = useMemo(() => {
    return sorted.slice(0, 3);
  }, [sorted]);

  // Visual podium order: silver (left), gold (center), bronze (right)
  const podiumOrder = useMemo(() => {
    return [top3[1], top3[0], top3[2]];
  }, [top3]);

  const podiumMeta = [
    { rank: 1, medal: MEDALS[1], height: 'h-20 sm:h-28', ring: 'border-zinc-400', pts: 'text-zinc-500' },
    { rank: 0, medal: MEDALS[0], height: 'h-24 sm:h-36', ring: 'border-primary', pts: 'text-amber-600' },
    { rank: 2, medal: MEDALS[2], height: 'h-16 sm:h-24', ring: 'border-orange-400', pts: 'text-orange-500' },
  ];

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return sorted;
    return sorted.filter(p => p.name.toLowerCase().includes(query));
  }, [sorted, searchQuery]);

  const top50 = useMemo(() => {
    return filtered.slice(0, 50);
  }, [filtered]);

  const myIndex = useMemo(() => {
    return sorted.findIndex(p => p.id === myProfileId);
  }, [sorted, myProfileId]);

  const showMyRankAtBottom = myIndex >= 50;
  const myParticipant = showMyRankAtBottom ? sorted[myIndex] : null;

  return (
    <div className="neobrutal-card animate-fade-slide-up">
      <div className="border-b-[2px] border-black pb-2.5 mb-5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
          GLOBAL LEADERBOARD
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-text-muted">
            {participants.length} PESERTA
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-success border-[2px] border-black shadow-[1px_1px_0px_#000] animate-subtle-pulse" />
        </div>
      </div>

      {/* Leaderboard Timeframe Switcher */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-surface-alt border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] font-mono">
        <button
          onClick={() => setTimeframe('alltime')}
          className={`py-1.5 text-xs font-black uppercase rounded transition-all flex items-center justify-center gap-1.5 ${timeframe === 'alltime'
              ? 'bg-primary text-black border-[1.5px] border-black shadow-[1.5px_1.5px_0px_#000]'
              : 'text-text-muted hover:text-black'
            }`}
        >
          <span>🏆 ALL-TIME</span>
        </button>
        <button
          onClick={() => setTimeframe('weekly')}
          className={`py-1.5 text-xs font-black uppercase rounded transition-all flex items-center justify-center gap-1.5 ${timeframe === 'weekly'
              ? 'bg-secondary text-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_#000]'
              : 'text-text-muted hover:text-black'
            }`}
        >
          <span>⚡ WEEKLY</span>
          <span className="bg-white text-secondary text-[9px] font-black px-1.5 py-0.5 rounded border border-black uppercase shadow-[1px_1px_0px_#000] shrink-0">
            COMING SOON
          </span>
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Cari nama peserta..."
            className="neobrutal-input text-xs font-mono w-full"
          />
        </div>
      )}

      {timeframe === 'weekly' ? (
        <div className="my-6 p-6 sm:p-8 bg-secondary/10 border-[3px] border-black rounded-xl shadow-[5px_5px_0px_#000] text-center space-y-3 font-mono animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-secondary text-white border-[2.5px] border-black flex items-center justify-center mx-auto text-2xl shadow-[3px_3px_0px_#000]">
            🔒
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white text-secondary text-[10px] font-black uppercase px-2.5 py-1 rounded border-[1.5px] border-black shadow-[2px_2px_0px_#000]">
              FEATURE LOCKED
            </div>
            <h4 className="text-sm sm:text-base font-black uppercase text-black tracking-tight">
              WEEKLY LEADERBOARD COMING SOON!
            </h4>
            <p className="text-xs text-black/80 max-w-md mx-auto font-medium leading-relaxed">
              Fitur papan peringkat mingguan (<strong>Weekly Leaderboard</strong>) saat ini sedang dikunci sementara. Nantikan pengumuman peluncuran resminya dalam waktu dekat! 🚀
            </p>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center text-text-muted font-mono space-y-2.5 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-surface-alt border-[2.5px] border-black flex items-center justify-center mx-auto text-xl shadow-[2px_2px_0px_#000]">
            🏆
          </div>
          <div className="text-xs font-black uppercase text-black tracking-wide">
            TIDAK ADA DATA PESERTA
          </div>
          <p className="text-[11px] max-w-md mx-auto text-black/70 font-medium leading-relaxed">
            Belum ada data peserta yang terdeteksi di leaderboard.
          </p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {!searchQuery.trim() && (
            <div className="mb-6 flex items-end justify-center gap-1.5 sm:gap-5">
              {podiumOrder.map((p, i) => {
                const meta = podiumMeta[i];
                if (!p) return <div key={`empty-${i}`} className="flex-1 w-0 max-w-[120px]" />;
                const isMe = myProfileId === p.id;
                const isGold = meta.rank === 0;
                const canClick = isAdmin;

                return (
                  <button
                    key={p.id}
                    onClick={canClick ? () => onSelect(p.id) : undefined}
                    className={`group flex flex-1 w-0 max-w-[130px] flex-col items-center focus:outline-none ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                    disabled={!canClick}
                  >
                    <div className="relative mb-2">
                      <Avatar
                        p={p}
                        className={`${isGold ? 'w-14 h-14 sm:w-20 sm:h-20' : 'w-11 h-11 sm:w-16 sm:h-16'} ${meta.ring} transition-transform ${canClick ? 'group-hover:-translate-y-1' : ''} shadow-[3px_3px_0px_#000]`}
                        textClass={isGold ? 'text-base sm:text-xl' : 'text-sm sm:text-base'}
                      />
                      <span className={`absolute -top-2 -right-1 ${isGold ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} drop-shadow`}>
                        {meta.medal}
                      </span>
                    </div>

                    <span
                      className="max-w-full truncate text-[9px] sm:text-[11px] font-extrabold text-black uppercase tracking-wide"
                      title={p.name}
                    >
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="mt-0.5 text-[7px] uppercase bg-tertiary text-white border-[2px] border-black px-1.5 py-px font-bold rounded shadow-[1px_1px_0px_#000]">
                        ME
                      </span>
                    )}

                    <div
                      className={`mt-2 w-full rounded-t-md border-[3px] border-b-0 border-black bg-surface-alt flex flex-col items-center justify-start pt-1.5 sm:pt-2 ${meta.height} transition-all ${canClick ? 'group-hover:bg-white' : ''}`}
                    >
                      <span className={`font-black leading-none ${isGold ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'} ${meta.pts}`}>
                        {(p.monthly_points ?? 0).toFixed(1)}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono font-bold text-text-muted uppercase tracking-widest">
                        pts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Full ranking list */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-text-muted font-mono text-[10px]">
              TIDAK ADA PESERTA YANG COCOK
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b-[3px] border-black text-text-muted uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-2.5 px-2 text-center w-10">#</th>
                  <th className="py-2.5 px-2">PLAYER</th>
                  <th className="py-2.5 px-2 text-right">PTS (JULI)</th>
                </tr>
              </thead>
              <tbody className="divide-y-[2px] divide-black text-black">
                {top50.map((p, idx) => {
                  const isSelected = selectedId === p.id;
                  const isMe = myProfileId === p.id;
                  const canClick = isAdmin;

                  // Find original rank from the full sorted list
                  const originalRank = sorted.findIndex(item => item.id === p.id) + 1;
                  const medal = originalRank <= 3 ? MEDALS[originalRank - 1] : null;

                  return (
                    <tr
                      key={p.id}
                      onClick={canClick ? () => onSelect(p.id) : undefined}
                      className={`transition-all duration-200 ${canClick ? 'cursor-pointer' : 'cursor-default'
                        } ${isSelected
                          ? 'bg-primary/20 font-extrabold'
                          : isMe
                            ? `bg-tertiary/5 ${canClick ? 'hover:bg-tertiary/10' : ''}`
                            : canClick ? 'hover:bg-surface-alt' : ''
                        }`}
                    >
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-black text-text-muted text-[11px]">{originalRank}</span>
                      </td>

                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar p={p} className="w-8 h-8" textClass="text-[10px]" />
                          <span className="font-extrabold text-black truncate max-w-[95px] sm:max-w-[150px]" title={p.name}>
                            {p.name}
                          </span>
                          {medal && <span className="text-sm leading-none">{medal}</span>}
                          {isMe && (
                            <span className="text-[8px] uppercase bg-tertiary text-white border-[2px] border-black px-1.5 py-0.5 font-bold rounded shadow-[1px_1px_0px_#000]">
                              ME
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={`py-2.5 px-2 text-right font-extrabold ${originalRank === 1 ? 'text-amber-600' :
                          originalRank === 2 ? 'text-zinc-500' :
                            originalRank === 3 ? 'text-orange-500' : 'text-black'
                        }`}>
                        {(p.monthly_points ?? 0).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {showMyRankAtBottom && myParticipant && (
            <div className="mt-4 pt-4 border-t-[3px] border-dashed border-black">
              <div className="text-[9px] uppercase tracking-wider text-text-muted font-bold mb-2">
                POSISI ANDA
              </div>
              <div
                className="flex items-center justify-between p-3 rounded-lg border-[3px] border-black bg-tertiary/10 shadow-[4px_4px_0px_#000] font-mono transition-all cursor-default"
              >
                <div className="flex items-center gap-3">
                  <span className="font-black text-black text-sm">#{myIndex + 1}</span>
                  <Avatar p={myParticipant} className="w-8 h-8" textClass="text-[10px]" />
                  <span className="font-extrabold text-black uppercase tracking-wide truncate max-w-[150px]">
                    {myParticipant.name}
                  </span>
                  <span className="text-[8px] uppercase bg-tertiary text-white border-[2px] border-black px-1.5 py-0.5 font-bold rounded shadow-[1px_1px_0px_#000]">
                    ME
                  </span>
                </div>
                <span className="font-black text-black text-sm">
                  {(myParticipant.monthly_points ?? 0).toFixed(1)} PTS
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
