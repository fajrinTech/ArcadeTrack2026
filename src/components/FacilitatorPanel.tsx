'use client';

import { Participant } from '@/lib/db';

interface LeaderboardPanelProps {
  participants: Participant[];
  selectedId: string | null;
  myProfileId: string | null;
  onSelect: (id: string) => void;
}

// Deterministic background color for the initials fallback, derived from id.
const AVATAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-success', 'bg-zinc-400'];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  onSelect,
}: LeaderboardPanelProps) {
  const sorted = [...participants].sort(
    (a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0)
  );

  const top3 = sorted.slice(0, 3);
  // Visual podium order: silver (left), gold (center), bronze (right)
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumMeta = [
    { rank: 1, medal: MEDALS[1], height: 'h-20 sm:h-28', ring: 'border-zinc-400', pts: 'text-zinc-600' },
    { rank: 0, medal: MEDALS[0], height: 'h-24 sm:h-36', ring: 'border-primary', pts: 'text-amber-700' },
    { rank: 2, medal: MEDALS[2], height: 'h-16 sm:h-24', ring: 'border-orange-400', pts: 'text-orange-700' },
  ];

  return (
    <div className="neobrutal-card animate-fade-slide-up">
      <div className="border-b-[2px] border-black pb-2.5 mb-5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
          GLOBAL LEADERBOARD
        </span>
        <span className="w-3.5 h-3.5 rounded-full bg-success border-[2px] border-black shadow-[1px_1px_0px_#000] animate-subtle-pulse" />
      </div>

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-text-muted font-mono text-[10px]">
          NO PLAYERS DETECTED
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="mb-6 flex items-end justify-center gap-1.5 sm:gap-5">
            {podiumOrder.map((p, i) => {
              const meta = podiumMeta[i];
              if (!p) return <div key={`empty-${i}`} className="flex-1 w-0 max-w-[120px]" />;
              const isMe = myProfileId === p.id;
              const isGold = meta.rank === 0;

              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="group flex flex-1 w-0 max-w-[130px] flex-col items-center focus:outline-none"
                >
                  <div className="relative mb-2">
                    <Avatar
                      p={p}
                      className={`${isGold ? 'w-14 h-14 sm:w-20 sm:h-20' : 'w-11 h-11 sm:w-16 sm:h-16'} ${meta.ring} transition-transform group-hover:-translate-y-1 shadow-[3px_3px_0px_#000]`}
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
                    className={`mt-2 w-full rounded-t-md border-[3px] border-b-0 border-black bg-surface-alt flex flex-col items-center justify-start pt-1.5 sm:pt-2 ${meta.height} transition-all group-hover:bg-white`}
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

          {/* Full ranking list */}
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b-[3px] border-black text-text-muted uppercase tracking-wider font-bold text-[10px]">
                <th className="py-2.5 px-2 text-center w-10">#</th>
                <th className="py-2.5 px-2">PLAYER</th>
                <th className="py-2.5 px-2 text-right">PTS (JULI)</th>
              </tr>
            </thead>
            <tbody className="divide-y-[2px] divide-black text-black">
              {sorted.map((p, idx) => {
                const isSelected = selectedId === p.id;
                const isMe = myProfileId === p.id;
                const medal = idx < 3 ? MEDALS[idx] : null;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/20 font-extrabold'
                        : isMe
                          ? 'bg-tertiary/5 hover:bg-tertiary/10'
                          : 'hover:bg-surface-alt'
                    }`}
                  >
                    <td className="py-2.5 px-2 text-center">
                      <span className="font-black text-text-muted text-[11px]">{idx + 1}</span>
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

                    <td className={`py-2.5 px-2 text-right font-extrabold ${
                      idx === 0 ? 'text-amber-700' :
                      idx === 1 ? 'text-zinc-600' :
                      idx === 2 ? 'text-orange-700' : 'text-black'
                    }`}>
                      {(p.monthly_points ?? 0).toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
