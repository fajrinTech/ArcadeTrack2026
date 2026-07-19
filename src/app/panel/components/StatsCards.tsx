'use client';

import React from 'react';

interface StatsCardsProps {
  totalBimbingan: number;
  averagePoints: number;
  totalGames: number;
  totalSkills: number;
}

export default function StatsCards({
  totalBimbingan,
  averagePoints,
  totalGames,
  totalSkills
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-slide-up">
      <div className="neobrutal-card p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-text-muted">Total Bimbingan</span>
        <span className="text-2xl font-black text-black mt-2">{totalBimbingan}</span>
      </div>
      <div className="neobrutal-card p-4 flex flex-col justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-text-muted">Rata-rata Poin</span>
          <span className="text-2xl font-black text-tertiary mt-2 block">
            {averagePoints.toFixed(1)}
          </span>
        </div>
        <span className="text-[9px] text-red-600 italic mt-1.5 font-sans leading-tight block">
          Poin = Game + (Skill × 0.5) dibagi Total Peserta
        </span>
      </div>
      <div className="neobrutal-card p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-text-muted">Total Game Badges</span>
        <span className="text-2xl font-black text-amber-600 mt-2">
          {totalGames}
        </span>
      </div>
      <div className="neobrutal-card p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase font-bold text-text-muted">Total Skill Badges</span>
        <span className="text-2xl font-black text-secondary mt-2">
          {totalSkills}
        </span>
      </div>
    </div>
  );
}
