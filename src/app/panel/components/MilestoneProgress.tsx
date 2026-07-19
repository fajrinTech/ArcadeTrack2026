'use client';

import React from 'react';

interface MilestoneProgressProps {
  totalGames: number;
  totalSkills: number;
}

export default function MilestoneProgress({ totalGames, totalSkills }: MilestoneProgressProps) {
  const currentTotal = totalGames + totalSkills;

  const milestones = [
    {
      number: 1,
      target: 500,
      gamesTarget: 200,
      skillsTarget: 300,
      barColor: 'bg-tertiary',
      borderColor: 'border-tertiary',
    },
    {
      number: 2,
      target: 800,
      gamesTarget: 300,
      skillsTarget: 500,
      barColor: 'bg-primary-dark',
      borderColor: 'border-primary-dark',
    },
    {
      number: 3,
      target: 1150,
      gamesTarget: 400,
      skillsTarget: 750,
      barColor: 'bg-success',
      borderColor: 'border-success',
    },
    {
      number: 4,
      target: 1500,
      gamesTarget: 500,
      skillsTarget: 1000,
      barColor: 'bg-secondary',
      borderColor: 'border-secondary',
    },
  ];

  return (
    <div className="neobrutal-card space-y-4 animate-fade-slide-up">
      <div className="border-b-[2px] border-black pb-2.5">
        <h2 className="text-sm font-black uppercase text-black">Berikut progres milestonemu sebagai Fasilitator!</h2>
        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
          Lihat progres untuk 4 milestonemu di bawah ini. Ingat, semakin cepat peserta menyelesaikan alur belajar mereka, semakin cepat milestone akan tercapai dan hadiah untuk milestone tersebut akan terbuka.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {milestones.map(m => {
          const percent = Math.min(100, Math.round((currentTotal / m.target) * 100));
          return (
            <div
              key={m.number}
              className="p-3.5 border-[2.5px] border-black rounded-lg bg-surface-alt flex flex-col justify-between gap-3 font-mono shadow-[3px_3px_0px_#000]"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-black uppercase">
                    Milestone #{m.number} ⏳
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-white border-[1.5px] border-black rounded shadow-[1px_1px_0px_#000]">
                    Target: {m.target}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed font-bold">
                  Mendorong {m.gamesTarget} Arcade Game & {m.skillsTarget} Skill Badge
                </p>
              </div>

              <div className="space-y-1.5">
                <div className={`w-full h-4 rounded-full border-[2.5px] ${m.borderColor} bg-white overflow-hidden p-0.5 shadow-[1.5px_1.5px_0px_#000]`}>
                  <div
                    className={`h-full rounded-full ${m.barColor} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[9px] text-text-muted font-bold">
                  <span>{percent}% Selesai</span>
                  <span>{currentTotal} / {m.target}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
