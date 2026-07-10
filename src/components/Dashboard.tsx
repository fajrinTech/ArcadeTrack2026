'use client';

import { useState } from 'react';
import { Participant, Badge } from '@/lib/db';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { 
  ExternalLinkIcon, 
  CheckIcon, 
  ExitIcon,
  DashboardIcon,
  BackpackIcon,
  ListBulletIcon
} from '@radix-ui/react-icons';

interface DashboardProps {
  participant: Participant;
  badges: Badge[];
  onResetSession: () => void;
}

export default function Dashboard({ participant, badges, onResetSession }: DashboardProps) {
  const activeMonthPrefix = '2026-07';
  const activeMonthName = 'Juli 2026';
  // Periode arcade berjalan: badge yang diperoleh sejak awal bulan ini dan
  // seterusnya. Badge sebelum tanggal ini = arsip akun lama (mis. akun
  // fasilitator), hanya ditampilkan dan TIDAK menyumbang poin.
  const activePeriodStart = `${activeMonthPrefix}-01`;

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'arcade_track' | 'fasttrack' | 'track_badge'>('dashboard');

  const isCurrentPeriod = (b: Badge) => b.earned_date >= activePeriodStart;
  const monthlyBadges = badges.filter(isCurrentPeriod);
  const historicalBadges = badges.filter(b => !isCurrentPeriod(b));

  const [activeBadgeFilter, setActiveBadgeFilter] = useState<'current' | 'all' | 'historical'>('current');

  const currentGames = monthlyBadges.filter(b => b.category === 'game');
  const currentSkills = monthlyBadges.filter(b => b.category === 'skill_badge');
  
  const totalCurrentGames = currentGames.length;
  const totalCurrentSkills = currentSkills.length;
  const totalCurrentPoints = totalCurrentGames + (totalCurrentSkills * 0.5);

  const totalOverallBadges = badges.length;

  const milestones = [
    { name: 'Milestone 1', games: 6, skills: 14, bonus: 7, total: 20 },
    { name: 'Milestone 2', games: 8, skills: 28, bonus: 18, total: 40 },
    { name: 'Milestone 3', games: 10, skills: 42, bonus: 29, total: 60 },
    { name: 'Ultimate', games: 12, skills: 56, bonus: 40, total: 80 }
  ];

  const currentMilestoneIndex = milestones.findIndex(m => totalCurrentGames < m.games || totalCurrentSkills < m.skills);
  const nextMilestone = currentMilestoneIndex !== -1 ? milestones[currentMilestoneIndex] : null;
  const lastCompletedMilestone = currentMilestoneIndex > 0 ? milestones[currentMilestoneIndex - 1] : (currentMilestoneIndex === -1 ? milestones[3] : null);

  const missingGames = nextMilestone ? Math.max(0, nextMilestone.games - totalCurrentGames) : 0;
  const missingSkills = nextMilestone ? Math.max(0, nextMilestone.skills - totalCurrentSkills) : 0;

  const activeTargetPoints = nextMilestone ? nextMilestone.games + nextMilestone.skills * 0.5 : 40;
  const completionPercentage = Math.min(100, Math.round((totalCurrentPoints / activeTargetPoints) * 100));

  // Total poin arcade = base (game 1pt + skill 0.5pt) + bonus milestone tertinggi.
  const totalArcadePoints = totalCurrentPoints + (lastCompletedMilestone?.bonus ?? 0);

  // Tier arcade murni dari ambang poin. Di bawah Trooper (50) belum eligible.
  const arcadeTiers = [
    { name: 'Arcade Trooper', points: 50, color: 'text-tertiary', bg: 'bg-tertiary', svg: 'https://services.google.com/fh/files/misc/arcade-trooper.svg' },
    { name: 'Arcade Ranger', points: 75, color: 'text-success', bg: 'bg-success', svg: 'https://services.google.com/fh/files/misc/arcade-ranger.svg' },
    { name: 'Arcade Champion', points: 95, color: 'text-secondary', bg: 'bg-secondary', svg: 'https://services.google.com/fh/files/misc/arcade-champion.svg' },
    { name: 'Arcade Legend', points: 120, color: 'text-black', bg: 'bg-primary', svg: 'https://services.google.com/fh/files/misc/arcade-legend.svg' },
  ];
  const currentTierIndex = (() => {
    let idx = -1;
    for (let i = 0; i < arcadeTiers.length; i++) {
      if (totalArcadePoints >= arcadeTiers[i].points) idx = i;
    }
    return idx;
  })();
  const currentTier = currentTierIndex >= 0 ? arcadeTiers[currentTierIndex] : null;
  const nextTier = currentTierIndex + 1 < arcadeTiers.length ? arcadeTiers[currentTierIndex + 1] : null;
  const tierFloor = currentTier?.points ?? 0;
  const tierProgressPercent = nextTier
    ? Math.min(100, Math.round(((totalArcadePoints - tierFloor) / (nextTier.points - tierFloor)) * 100))
    : 100;

  const radius = 36;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const displayedBadges = (() => {
    if (activeBadgeFilter === 'current') return monthlyBadges;
    if (activeBadgeFilter === 'historical') return historicalBadges;
    return badges;
  })().sort((a, b) => new Date(b.earned_date).getTime() - new Date(a.earned_date).getTime());

  const targetJulyBadges = [
    { name: 'Arcade Adventure', category: 'game' },
    { name: 'Arcade Base Camp', category: 'game' },
    { name: 'Arcade Trail', category: 'game' },
    { name: 'Arcade Voyage', category: 'game' },
    { name: 'Arcade Simulator: Data Mesh Architect', category: 'game' },
    { name: 'Safe Spaces', category: 'game' }
  ];

  const fasttrackSkillBadges = [
    { name: 'Create and Manage Cloud Resources', category: 'skill' },
    { name: 'Perform Foundational Infrastructure Tasks in Google Cloud', category: 'skill' },
    { name: 'Perform Foundational Data, ML, and AI Tasks in Google Cloud', category: 'skill' },
    { name: 'Build and Secure Networks in Google Cloud', category: 'skill' },
    { name: 'Deploy and Manage Cloud Environments with Google Cloud', category: 'skill' },
    { name: 'Integrate with Kubernetes and Google Cloud', category: 'skill' }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="neobrutal-card animate-fade-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest text-tertiary font-bold font-mono">
              TARGET_PROFILE: {participant.name.toUpperCase()}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              {participant.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-text-muted">
              <a 
                href={participant.profile_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-tertiary hover:text-secondary transition-colors font-bold uppercase font-mono text-[10px]"
              >
                <span>Google Skills Boost Profile</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
              <span className="text-zinc-300 font-mono">|</span>
              <span className="font-mono text-[10px] font-bold">
                ARSIP: {historicalBadges.length} badge lama (tidak dihitung)
              </span>
            </div>
          </div>
          <div className="text-left md:text-right font-mono text-[10px] space-y-3 flex flex-col md:items-end justify-between">
            <div className="space-y-1 text-text-muted font-bold">
              <div>SYS_TARGET: {activeMonthName.toUpperCase()}</div>
              <div>SYNCED_AT: {participant.last_synced ? new Date(participant.last_synced).toLocaleString('id-ID') : 'Belum sync'}</div>
            </div>
            
            <button
              onClick={onResetSession}
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold font-mono text-white bg-black hover:bg-secondary border-[3px] border-black rounded-lg px-3 py-1.5 shadow-[3px_3px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000]"
            >
              <ExitIcon className="w-3 h-3" />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Bar */}
      <div className="flex border-[3px] border-black bg-surface-alt p-1 rounded-lg shadow-[4px_4px_0_#000]">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial duration-200 ${
            activeSubTab === 'dashboard' 
              ? 'bg-primary text-black border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5' 
              : 'text-text-muted hover:text-black hover:bg-white'
          }`}
        >
          <DashboardIcon className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveSubTab('arcade_track')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial duration-200 ${
            activeSubTab === 'arcade_track' 
              ? 'bg-tertiary text-white border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5' 
              : 'text-text-muted hover:text-black hover:bg-white'
          }`}
        >
          <BackpackIcon className="w-4 h-4" />
          <span>Arcade Track</span>
        </button>
        <button
          onClick={() => setActiveSubTab('fasttrack')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial duration-200 ${
            activeSubTab === 'fasttrack' 
              ? 'bg-secondary text-white border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5' 
              : 'text-text-muted hover:text-black hover:bg-white'
          }`}
        >
          <ListBulletIcon className="w-4 h-4" />
          <span>Fasttrack</span>
        </button>
        <button
          onClick={() => setActiveSubTab('track_badge')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial duration-200 ${
            activeSubTab === 'track_badge' 
              ? 'bg-success text-white border-[3px] border-black shadow-[2px_2px_0px_#000] -translate-y-0.5' 
              : 'text-text-muted hover:text-black hover:bg-white'
          }`}
        >
          <CheckIcon className="w-4 h-4" />
          <span>Track Badge</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        
        {/* DASHBOARD SUBTAB */}
        {activeSubTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Poin + Tier + Milestone chart (satu kartu) */}
            <div className="neobrutal-card animate-fade-slide-up stagger-1">
              <div className="flex flex-col lg:flex-row lg:divide-x-[2px] lg:divide-black divide-y-[2px] lg:divide-y-0 divide-black">

                {/* KIRI: Arcade Tier (hero) */}
                <div className="lg:pr-6 pb-5 lg:pb-0 flex flex-col justify-between lg:min-w-[210px]">
                  <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Arcade Tier</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-[2px] border-black shadow-[1px_1px_0px_#000] ${currentTier ? currentTier.bg : 'bg-surface-alt'}`} />
                  </div>

                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-24 h-24 rounded-xl border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_#000] ${currentTier ? currentTier.bg : 'bg-surface-alt'}`}>
                      {currentTier ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentTier.svg} alt={currentTier.name} className="w-16 h-16 object-contain" />
                      ) : (
                        <span className="text-3xl opacity-40">🔒</span>
                      )}
                    </div>
                    <div className={`text-base font-black uppercase leading-tight ${currentTier ? currentTier.color : 'text-text-muted'}`}>
                      {currentTier ? currentTier.name : 'Belum Eligible'}
                    </div>
                    <div className="text-[9px] font-mono text-text-muted font-bold">
                      {currentTier ? `≥ ${currentTier.points} pts tercapai` : `Butuh ${arcadeTiers[0].points} pts`}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 font-mono text-[9px] font-bold">
                    <div className="flex justify-between text-text-muted">
                      <span>{nextTier ? `NEXT: ${nextTier.name}` : 'TIER MAKSIMAL'}</span>
                      <span className="text-black">{nextTier ? `${totalArcadePoints.toFixed(1)} / ${nextTier.points}` : `${totalArcadePoints.toFixed(1)} pts`}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-alt border-[2px] border-black rounded-md overflow-hidden">
                      <div className={`h-full rounded-sm transition-all duration-1000 ${currentTier?.bg ?? 'bg-tertiary'}`} style={{ width: `${tierProgressPercent}%` }} />
                    </div>
                  </div>
                </div>

                {/* TENGAH: Total Poin (ringkas) */}
                <div className="lg:px-6 py-5 lg:py-0 flex flex-col justify-between flex-1">
                  <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Poin Arcade {activeMonthName}</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-primary border-[2px] border-black shadow-[1px_1px_0px_#000]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-6xl font-black text-black leading-none" style={{ fontFamily: 'var(--font-sans)' }}>{totalArcadePoints.toFixed(1)}</span>
                    <span className="text-text-muted text-xs font-extrabold uppercase font-mono">pts</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] font-bold">
                    <span className="border-[2px] border-black rounded-md px-2 py-1 bg-surface-alt">🎮 {totalCurrentGames} game · {totalCurrentGames.toFixed(1)}pt</span>
                    <span className="border-[2px] border-black rounded-md px-2 py-1 bg-surface-alt">🏅 {totalCurrentSkills} skill · {(totalCurrentSkills * 0.5).toFixed(1)}pt</span>
                    {lastCompletedMilestone && (
                      <span className="border-[2px] border-black rounded-md px-2 py-1 bg-success/20 text-success">+{lastCompletedMilestone.bonus}pt bonus</span>
                    )}
                  </div>
                </div>

                {/* KANAN: Milestone chart + target */}
                <div className="lg:pl-6 pt-5 lg:pt-0 flex flex-col sm:flex-row items-center gap-5 flex-1">
                  <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r={radius} fill="transparent" stroke="#000000" strokeWidth={11} />
                      <circle cx="48" cy="48" r={radius} fill="transparent" stroke="#F5F5F5" strokeWidth={strokeWidth} />
                      <circle cx="48" cy="48" r={radius} fill="transparent" stroke="url(#arcadeGrad)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                      <defs>
                        <linearGradient id="arcadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFEB3B" />
                          <stop offset="100%" stopColor="#FF5252" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
                      <span className="text-lg font-black text-black leading-none">{completionPercentage}%</span>
                      <span className="text-[7px] text-text-muted font-bold uppercase mt-0.5">Milestone</span>
                    </div>
                  </div>

                  <div className="flex-grow w-full space-y-3">
                    {nextMilestone ? (
                      <div className="text-[11px] font-bold text-black uppercase tracking-wide">
                        Target: <span className="text-secondary font-extrabold border-[2px] border-black bg-secondary/10 px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000]">{nextMilestone.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-success font-black uppercase tracking-wider border-[2px] border-black bg-success/20 px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_#000] inline-block">ALL MILESTONES SECURED</span>
                    )}

                    {nextMilestone && (
                      <div className="space-y-2 font-mono text-[9px] font-bold">
                        <div>
                          <div className="flex justify-between text-text-muted">
                            <span>GAMES {totalCurrentGames}/{nextMilestone.games}</span>
                            <span className="text-secondary">{missingGames > 0 ? `-${missingGames}` : 'OK'}</span>
                          </div>
                          <div className="w-full h-2.5 bg-surface-alt border-[2px] border-black rounded-md mt-1 overflow-hidden">
                            <div className="h-full bg-primary animate-progress rounded-sm" style={{ width: `${Math.min(100, (totalCurrentGames / nextMilestone.games) * 100)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-text-muted">
                            <span>SKILLS {totalCurrentSkills}/{nextMilestone.skills}</span>
                            <span className="text-tertiary">{missingSkills > 0 ? `-${missingSkills}` : 'OK'}</span>
                          </div>
                          <div className="w-full h-2.5 bg-surface-alt border-[2px] border-black rounded-md mt-1 overflow-hidden">
                            <div className="h-full bg-tertiary animate-progress rounded-sm" style={{ width: `${Math.min(100, (totalCurrentSkills / nextMilestone.skills) * 100)}%`, animationDelay: '200ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Milestone Roadmap + Activity Heatmap (gabungan) */}
            <div className="neobrutal-card animate-fade-slide-up stagger-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x-[2px] lg:divide-black">
                {/* KIRI: Milestone Roadmap (snake 2x2) */}
                <div className="lg:pr-6 space-y-4">
                  <div className="border-b-[2px] border-black pb-2.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
                      MILESTONE_ROADMAP
                    </span>
                    <span className="text-[10px] font-mono text-text-muted font-bold">{totalCurrentPoints.toFixed(1)} PTS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {milestones.map((m, idx) => {
                      const isCompleted = totalCurrentGames >= m.games && totalCurrentSkills >= m.skills;
                      const isNext = !isCompleted && (idx === 0 || (totalCurrentGames >= milestones[idx - 1].games && totalCurrentSkills >= milestones[idx - 1].skills));

                      return (
                        <div
                          key={m.name}
                          className={`relative p-3 border-[3px] border-black rounded-lg flex flex-col gap-2 transition-all shadow-[3px_3px_0px_#000] ${
                            isCompleted
                              ? 'bg-success/10 border-success'
                              : isNext
                                ? 'bg-primary/15 border-black'
                                : 'bg-surface-alt border-black'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 shrink-0 rounded-full border-[3px] border-black flex items-center justify-center transition-all z-10 shadow-[2px_2px_0px_#000] ${
                              isCompleted ? 'bg-success text-white font-black' : 'bg-white text-text-muted font-bold'
                            }`}>
                              {isCompleted ? (
                                <CheckIcon className="w-4 h-4 stroke-[3px]" />
                              ) : (
                                <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                              )}
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider truncate ${
                              isCompleted ? 'text-success' : 'text-black'
                            }`}>
                              {m.name}
                            </span>
                          </div>

                          <div className="font-mono text-[9px] text-text-muted font-bold leading-relaxed">
                            <div className="text-black">{m.games}G / {m.skills}S</div>
                            <div>+{m.bonus} Bonus · Total {m.total} pt</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KANAN: Activity Heatmap */}
                <div className="lg:pl-6 mt-6 lg:mt-0 border-t-[2px] border-black pt-6 lg:border-t-0 lg:pt-0">
                  <ActivityHeatmap badges={badges} embedded />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARCADE TRACK SUBTAB */}
        {activeSubTab === 'arcade_track' && (
          <div className="neobrutal-card animate-fade-slide-up">
            <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
                LIST_TARGET_BADGES_BULAN_INI: {activeMonthName.toUpperCase()}
              </span>
              <span className="text-[10px] text-text-muted font-mono font-bold">Wajib diselesaikan di periode ini</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targetJulyBadges.map((targetBadge, idx) => {
                const isEarned = monthlyBadges.some(b => b.badge_name.toLowerCase().includes(targetBadge.name.toLowerCase()));
                
                return (
                  <div 
                    key={idx} 
                    className={`p-4 border-[3px] border-black rounded-lg flex items-center justify-between gap-4 transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000] animate-fade-slide-up ${
                      isEarned 
                        ? 'bg-success/10 border-success' 
                        : 'bg-white'
                    }`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div>
                      <h4 className="text-xs font-black tracking-wide uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
                        {targetBadge.name}
                      </h4>
                      <p className="text-[9px] text-text-muted font-mono mt-1 font-bold">
                        BOBOT: 1.0 PTS | KATEGORI: {targetBadge.category.toUpperCase()}
                      </p>
                    </div>

                    <span className={`text-[9px] font-mono font-bold px-2.5 py-1 border-[2px] border-black rounded shadow-[2px_2px_0px_#000] ${
                      isEarned 
                        ? 'text-white bg-success' 
                        : 'text-white bg-secondary'
                    }`}>
                      {isEarned ? 'DONE' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FASTTRACK SUBTAB */}
        {activeSubTab === 'fasttrack' && (
          <div className="neobrutal-card animate-fade-slide-up">
            <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">
                FASTTRACK_FOUNDATIONAL_SKILL_BADGES
              </span>
              <span className="text-[10px] text-text-muted font-mono font-bold">Daftar badge mudah bernilai +0.5 poin</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fasttrackSkillBadges.map((targetBadge, idx) => {
                const isEarned = badges.some(b => b.badge_name.toLowerCase().includes(targetBadge.name.toLowerCase()));
                
                return (
                  <div 
                    key={idx} 
                    className={`p-4 border-[3px] border-black rounded-lg flex items-center justify-between gap-4 transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000] animate-fade-slide-up ${
                      isEarned 
                        ? 'bg-success/10 border-success' 
                        : 'bg-white'
                    }`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-xs font-extrabold tracking-wide uppercase truncate" style={{ fontFamily: 'var(--font-sans)' }} title={targetBadge.name}>
                        {targetBadge.name}
                      </h4>
                      <p className="text-[9px] text-text-muted font-mono mt-1 font-bold">
                        BOBOT: 0.5 PTS | KATEGORI: SKILL BADGE
                      </p>
                    </div>

                    <span className={`text-[9px] font-mono font-bold px-2.5 py-1 border-[2px] border-black rounded flex-shrink-0 shadow-[2px_2px_0px_#000] ${
                      isEarned 
                        ? 'text-white bg-success' 
                        : 'text-text-muted bg-surface-alt'
                    }`}>
                      {isEarned ? 'DONE' : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TRACK BADGE SUBTAB */}
        {activeSubTab === 'track_badge' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start animate-fade-slide-up">
            <div className="xl:col-span-2 neobrutal-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[2px] border-black pb-2.5 mb-4">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">COLLECTED_ASSETS</span>
                <div className="flex border-[2px] border-black bg-surface-alt text-[10px] font-bold rounded-lg p-0.5 shadow-[2px_2px_0px_#000]">
                  <button onClick={() => setActiveBadgeFilter('current')} className={`px-3 py-1.5 transition-colors uppercase rounded-md ${activeBadgeFilter === 'current' ? 'bg-primary text-black' : 'text-text-muted hover:text-black hover:bg-white'}`}>Periode Ini ({monthlyBadges.length})</button>
                  <button onClick={() => setActiveBadgeFilter('all')} className={`px-3 py-1.5 transition-colors uppercase rounded-md ${activeBadgeFilter === 'all' ? 'bg-primary text-black' : 'text-text-muted hover:text-black hover:bg-white'}`}>Semua ({totalOverallBadges})</button>
                  <button onClick={() => setActiveBadgeFilter('historical')} className={`px-3 py-1.5 transition-colors uppercase rounded-md ${activeBadgeFilter === 'historical' ? 'bg-primary text-black' : 'text-text-muted hover:text-black hover:bg-white'}`}>Riwayat ({historicalBadges.length})</button>
                </div>
              </div>

              {displayedBadges.length > 0 ? (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {displayedBadges.map((badge, idx) => (
                    <div key={idx} className="p-3.5 bg-white border-[2px] border-black flex items-center justify-between gap-4 rounded-lg hover:border-zinc-800 transition-colors shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {badge.image_url ? <img src={badge.image_url} alt={badge.badge_name} className="w-10 h-10 object-contain flex-shrink-0" /> : <div className="w-10 h-10 bg-surface-alt flex items-center justify-center flex-shrink-0 font-bold font-mono text-text-muted text-xs rounded-lg border-[2px] border-black">[X]</div>}
                        <div className="min-w-0">
                          <h4 className="text-[11.5px] font-bold text-black leading-snug whitespace-normal break-words">{badge.badge_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 font-bold border-[2px] border-black rounded ${badge.category === 'game' ? 'bg-secondary text-white' : 'bg-tertiary text-white'}`}>{badge.category === 'game' ? 'GAME' : 'SKILL'}</span>
                            <span className="text-[9px] text-text-muted font-mono font-bold">Diterima: {badge.earned_date}</span>
                          </div>
                        </div>
                      </div>
                      {isCurrentPeriod(badge) ? (
                        <span className="text-xs font-mono font-bold text-black flex-shrink-0 bg-primary border-[2px] border-black px-2.5 py-1 rounded shadow-[2px_2px_0px_#000]">+{badge.points} pt</span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-text-muted flex-shrink-0 bg-surface-alt border-[2px] border-black px-2.5 py-1 rounded" title="Badge lama, tidak dihitung poin arcade">ARSIP</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border-[2px] border-dashed border-black font-mono text-[10px] text-text-muted rounded-lg">BELUM ADA BADGE YANG TERCATAT UNTUK KATEGORI INI.</div>
              )}
            </div>

            <div className="xl:col-span-1 neobrutal-card self-stretch flex flex-col justify-between">
              <div>
                <div className="border-b-[2px] border-black pb-2.5 mb-4"><span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">TELEMETRY_TIMELINE</span></div>
                {badges.length > 0 ? (
                  <div className="relative pl-3.5 border-l-[3px] border-black space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {badges.sort((a, b) => new Date(b.earned_date).getTime() - new Date(a.earned_date).getTime()).slice(0, 15).map((badge, idx) => (
                      <div key={idx} className="relative font-mono text-[10px]">
                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-[2px] border-black shadow-[1px_1px_0_#000] ${badge.category === 'game' ? 'bg-secondary' : 'bg-tertiary'}`} />
                        <span className="text-[9px] text-text-muted font-bold block">[{badge.earned_date}]</span>
                        <p className="text-black truncate mt-0.5 font-bold" title={badge.badge_name}>{badge.badge_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-text-muted font-mono text-[10px]">NO ACTIONS DETECTED IN LOG.</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
