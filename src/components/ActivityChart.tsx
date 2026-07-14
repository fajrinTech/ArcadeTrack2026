'use client';

import { useState } from 'react';
import { Badge } from '@/lib/db';

interface ActivityChartProps {
  badges: Badge[];
  activeMonthPrefix: string; // e.g. "2026-07"
  embedded?: boolean;
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function ActivityChart({ badges, activeMonthPrefix, embedded = false }: ActivityChartProps) {
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  // Parsing tahun dan bulan aktif
  const [yearStr, monthStr] = activeMonthPrefix.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-indexed (1-12)
  const totalDays = new Date(year, month, 0).getDate();
  const monthName = MONTH_NAMES[month - 1];

  // Definisikan rentang 5 minggu dalam bulan berjalan
  const weekRanges = [
    { name: 'W1', label: 'Minggu 1', start: 1, end: 7 },
    { name: 'W2', label: 'Minggu 2', start: 8, end: 14 },
    { name: 'W3', label: 'Minggu 3', start: 15, end: 21 },
    { name: 'W4', label: 'Minggu 4', start: 22, end: Math.min(28, totalDays) },
  ];
  if (totalDays > 28) {
    weekRanges.push({ name: 'W5', label: 'Minggu 5', start: 29, end: totalDays });
  }

  // Hitung jumlah total badge untuk setiap minggunya
  const chartWeeks = weekRanges.map((range) => {
    let games = 0;
    let skills = 0;

    for (const b of badges) {
      if (b.earned_date.startsWith(activeMonthPrefix)) {
        const day = parseInt(b.earned_date.split('-')[2]);
        if (day >= range.start && day <= range.end) {
          if (b.category === 'game') {
            games += 1;
          } else if (b.category === 'skill_badge' || b.category === 'skill') {
            skills += 1;
          }
        }
      }
    }

    const total = games + skills;
    return {
      ...range,
      games,
      skills,
      total,
    };
  });

  const totalInRange = chartWeeks.reduce((sum, w) => sum + w.total, 0);
  const activeWeeks = chartWeeks.filter(w => w.total > 0).length;

  // Temukan jumlah maks mingguan untuk visualisasi (minimal 5 agar chart proporsional)
  const maxBadgeCount = Math.max(5, ...chartWeeks.map(w => w.total));
  const chartHeightPx = 210; // Tinggi grafik batang yang disesuaikan dengan tinggi Roadmap di kiri

  // Periksa apakah ini minggu ini
  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && (todayDate.getMonth() + 1) === month;
  const currentDay = todayDate.getDate();

  return (
    <div className={embedded ? 'space-y-4' : 'neobrutal-card space-y-4 animate-fade-slide-up stagger-4'}>
      {/* Header */}
      <div className="border-b-[2px] border-black pb-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
          Total Badge Selesai Per Minggu ({monthName} {year})
        </span>
        <span className="text-[10px] font-mono text-text-muted font-bold">
          {totalInRange} badge · {activeWeeks} minggu aktif
        </span>
      </div>

      {/* Chart Area */}
      <div className="relative border-[3px] border-black rounded-lg bg-white p-4 shadow-[3px_3px_0px_#000]">

        {/* Horizontal Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 pb-14 pointer-events-none opacity-10">
          <div className="border-b border-black w-full" />
          <div className="border-b border-black w-full" />
          <div className="border-b border-black w-full" />
        </div>
        <div className="pt-2">
          <div className="grid grid-cols-5 h-[240px] pb-1 relative z-10 px-1 gap-2 items-end justify-items-center">
            {chartWeeks.map((week) => {
              const totalHeight = (week.total / maxBadgeCount) * chartHeightPx;
              const isTodayInWeek = isCurrentMonth && currentDay >= week.start && currentDay <= week.end;

              return (
                <div 
                  key={week.name} 
                  className="flex flex-col items-center w-full group relative cursor-pointer select-none"
                  onClick={() => setActiveWeek(activeWeek === week.name ? null : week.name)}
                >
                  
                  {/* Tooltip on Hover / Tap */}
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black text-[10px] font-mono p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] transition-opacity duration-150 z-30 min-w-[135px] text-center pointer-events-none ${
                    activeWeek === week.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="font-bold border-b border-black/25 pb-1 mb-1 text-black">
                      {week.label} ({week.start}-{week.end} {monthName.slice(0, 3)})
                    </div>
                    {week.total > 0 ? (
                      <div className="space-y-0.5">
                        <div className="font-black text-secondary text-xs">{week.total} BADGE SELESAI</div>
                        <div className="text-[10px] text-text-muted mt-1 space-y-0.5">
                          <div>🎮 {week.games} Game Badges</div>
                          <div>🏅 {week.skills} Skill Badges</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-text-muted">Belum ada aktivitas</div>
                    )}
                  </div>

                  {/* Vertical Column Bar */}
                  <div className="w-8 sm:w-12 relative flex flex-col justify-end items-center transition-all group-hover:translate-y-[-2px]" style={{ height: `${chartHeightPx}px` }}>
                    {week.total > 0 ? (
                      <div 
                        className="w-full rounded-md border-[2.5px] border-black bg-primary overflow-hidden shadow-[2px_2px_0px_#000]"
                        style={{ height: `${totalHeight}px` }}
                      />
                    ) : (
                      /* 0 Badges indicator (dashed subtle box for neobrutal style) */
                      <div className="w-full h-1.5 border-[2.5px] border-dashed border-black/20 rounded-md" />
                    )}
                  </div>

                  {/* Week Label */}
                  <div className="mt-2 text-center flex flex-col items-center">
                    <span className={`font-mono text-xs font-bold ${isTodayInWeek ? 'bg-secondary text-white px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000] border border-black' : 'text-text-muted'}`}>
                      {week.name}
                    </span>
                    <span className="text-[9px] text-text-muted/65 font-mono font-bold mt-0.5">
                      {week.start}-{week.end}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-text-muted px-1">
        <div className="flex items-center gap-1">
          <span>* Arahkan kursor ke bar untuk detail mingguan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 bg-primary border-[2px] border-black shadow-[1px_1px_0px_#000] rounded" />
            <span>Total Badges (Game + Skill)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
