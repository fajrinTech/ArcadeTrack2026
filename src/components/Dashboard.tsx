'use client';

import { useState, useEffect, useRef } from 'react';
import { Participant, Badge, SkillBadge } from '@/lib/db';
import ActivityChart from '@/components/ActivityChart';
import { 
  CheckIcon, 
  DashboardIcon,
  BackpackIcon,
  ListBulletIcon
} from '@radix-ui/react-icons';
import { animate } from 'animejs';

interface LiquidWaveProps {
  colorClass: string;
  milestoneIdx: number;
}

function LiquidWave({ colorClass, milestoneIdx }: LiquidWaveProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!pathRef.current) return;
    
    // Wave animation using anime.js v4
    const anim = animate(pathRef.current, {
      d: [
        'M0,12 C50,18 150,6 200,12 L200,100 L0,100 Z',
        'M0,12 C50,6 150,18 200,12 L200,100 L0,100 Z'
      ],
      duration: 2500 + milestoneIdx * 400, // slightly different speeds
      ease: 'inOutSine',
      direction: 'alternate',
      loop: true
    });

    return () => {
      anim.pause();
    };
  }, [milestoneIdx]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-0">
      <svg 
        viewBox="0 0 200 100" 
        preserveAspectRatio="none" 
        className={`absolute bottom-0 left-0 w-full h-[110%] opacity-20 ${colorClass}`}
      >
        <path 
          ref={pathRef} 
          d="M0,12 C50,12 150,12 200,12 L200,100 L0,100 Z" 
          className="fill-current"
        />
      </svg>
    </div>
  );
}

const getMilestoneColors = (idx: number) => {
  switch (idx) {
    case 0: // Milestone 1
      return {
        cardBg: 'bg-success/10 border-success',
        waveColor: 'text-success',
        textColor: 'text-success'
      };
    case 1: // Milestone 2
      return {
        cardBg: 'bg-primary/10 border-primary-dark',
        waveColor: 'text-primary-dark',
        textColor: 'text-primary-dark'
      };
    case 2: // Milestone 3
      return {
        cardBg: 'bg-secondary/10 border-secondary',
        waveColor: 'text-secondary',
        textColor: 'text-secondary'
      };
    case 3: // Ultimate
    default:
      return {
        cardBg: 'bg-tertiary/10 border-tertiary',
        waveColor: 'text-tertiary',
        textColor: 'text-tertiary'
      };
  }
};

interface DashboardProps {
  participant: Participant;
  badges: Badge[];
}

export default function Dashboard({ participant, badges }: DashboardProps) {

  const activeMonthPrefix = '2026-07';
  const activeMonthName = 'Juli 2026';
  // Periode arcade berjalan: badge yang diperoleh sejak awal bulan ini dan
  // seterusnya. Badge sebelum tanggal ini = arsip akun lama (mis. akun
  // fasilitator), hanya ditampilkan dan TIDAK menyumbang poin.
  const activePeriodStart = `${activeMonthPrefix}-01`;

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'arcade_track' | 'fasttrack' | 'track_badge'>('dashboard');
  const [fasttrackPage, setFasttrackPage] = useState(1);

  const isCurrentPeriod = (b: Badge) => b.earned_date >= activePeriodStart;
  const monthlyBadges = badges.filter(isCurrentPeriod);
  const historicalBadges = badges.filter(b => !isCurrentPeriod(b));

  const [activeBadgeFilter, setActiveBadgeFilter] = useState<'current' | 'all' | 'historical'>('current');
  const [selectedGameModal, setSelectedGameModal] = useState<{ name: string; category: string; url: string; accessCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    { name: 'Arcade Base Camp', category: 'game', url: 'https://www.skills.google/games/7313', accessCode: '1q-basecamp-07511' },
    { name: 'Arcade Adventure', category: 'game', url: 'https://www.skills.google/games/7314', accessCode: '1q-lowcode-92316' },
    { name: 'Arcade Voyage', category: 'game', url: 'https://www.skills.google/games/7315', accessCode: '1q-bucket-58231' },
    { name: 'Arcade Trail', category: 'game', url: 'https://www.skills.google/games/7316', accessCode: '1q-workspace-31069' },
    { name: 'Arcade Simulator: Data Mesh Architect', category: 'game', url: 'https://www.skills.google/games/7317', accessCode: '1q-datamesh-16451' },
    { name: 'Safe Spaces', category: 'game', url: 'https://www.skills.google/games/7318', accessCode: '1q-security-19110' }
  ];

  const [skillBadges, setSkillBadges] = useState<SkillBadge[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [skillsSearch, setSkillsSearch] = useState('');
  const [skillsDifficulty, setSkillsDifficulty] = useState('all');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setIsLoadingSkills(true);
        const res = await fetch('/api/skills');
        if (res.ok) {
          const data = await res.json();
          setSkillBadges(data.skills ?? []);
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
      } finally {
        setIsLoadingSkills(false);
      }
    };
    fetchSkills();
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    setFasttrackPage(1);
  }, [skillsSearch, skillsDifficulty]);

  // Filter skills based on search & difficulty
  const filteredSkills = skillBadges.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(skillsSearch.toLowerCase());
    const matchesDifficulty = skillsDifficulty === 'all' || 
      (skill.difficulty && skill.difficulty.toLowerCase() === skillsDifficulty.toLowerCase());
    return matchesSearch && matchesDifficulty;
  });

  const badgesPerPage = 8;
  const totalPages = Math.ceil(filteredSkills.length / badgesPerPage);
  const startIndex = (fasttrackPage - 1) * badgesPerPage;
  const paginatedBadges = filteredSkills.slice(startIndex, startIndex + badgesPerPage);

  return (
    <div className="space-y-6">
      {/* Sub-tab Bar */}
      <div className="flex overflow-x-auto no-scrollbar border-[3px] border-black bg-surface-alt p-1 rounded-lg shadow-[4px_4px_0_#000] gap-1.5">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial shrink-0 duration-200 border-[3px] ${
            activeSubTab === 'dashboard' 
              ? 'bg-primary text-black border-black shadow-[2px_2px_0px_#000] -translate-y-0.5 z-10' 
              : 'text-text-muted hover:text-black hover:bg-white border-transparent'
          }`}
        >
          <DashboardIcon className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveSubTab('arcade_track')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial shrink-0 duration-200 border-[3px] ${
            activeSubTab === 'arcade_track' 
              ? 'bg-tertiary text-white border-black shadow-[2px_2px_0px_#000] -translate-y-0.5 z-10' 
              : 'text-text-muted hover:text-black hover:bg-white border-transparent'
          }`}
        >
          <BackpackIcon className="w-4 h-4" />
          <span>Arcade Track</span>
        </button>
        <button
          onClick={() => setActiveSubTab('fasttrack')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial shrink-0 duration-200 border-[3px] ${
            activeSubTab === 'fasttrack' 
              ? 'bg-secondary text-white border-black shadow-[2px_2px_0px_#000] -translate-y-0.5 z-10' 
              : 'text-text-muted hover:text-black hover:bg-white border-transparent'
          }`}
        >
          <ListBulletIcon className="w-4 h-4" />
          <span>Fasttrack</span>
        </button>
        <button
          onClick={() => setActiveSubTab('track_badge')}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex-1 sm:flex-initial shrink-0 duration-200 border-[3px] ${
            activeSubTab === 'track_badge' 
              ? 'bg-success text-white border-black shadow-[2px_2px_0px_#000] -translate-y-0.5 z-10' 
              : 'text-text-muted hover:text-black hover:bg-white border-transparent'
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
                <div className="lg:pr-6 pb-5 lg:pb-0 flex flex-col justify-between lg:w-[280px] lg:shrink-0">
                  <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Arcade Tier</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-[2px] border-black shadow-[1px_1px_0px_#000] ${currentTier ? currentTier.bg : 'bg-surface-alt'}`} />
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 my-2">
                    <div className={`w-28 h-28 rounded-xl border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_#000] ${currentTier ? currentTier.bg : 'bg-surface-alt'} transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000]`}>
                      {currentTier ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentTier.svg} alt={currentTier.name} className="w-20 h-20 object-contain" />
                      ) : (
                        <span className="text-4xl opacity-40">🔒</span>
                      )}
                    </div>
                    <div className={`text-base font-black uppercase leading-tight ${currentTier ? currentTier.color : 'text-text-muted'}`}>
                      {currentTier ? currentTier.name : 'Belum Eligible'}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted font-bold">
                      {currentTier ? `≥ ${currentTier.points} pts tercapai` : `Butuh ${arcadeTiers[0].points} pts`}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 font-mono text-[10px] font-bold">
                    <div className="flex justify-between text-text-muted">
                      <span>{nextTier ? `NEXT: ${nextTier.name}` : 'TIER MAKSIMAL'}</span>
                      <span className="text-black">{nextTier ? `${totalArcadePoints.toFixed(1)} / ${nextTier.points}` : `${totalArcadePoints.toFixed(1)} pts`}</span>
                    </div>
                    <div className="w-full h-3 bg-surface-alt border-[2px] border-black rounded-md overflow-hidden shadow-[1px_1px_0px_#000]">
                      <div className={`h-full rounded-sm transition-all duration-1000 ${currentTier?.bg ?? 'bg-tertiary'} ${tierProgressPercent > 0 ? 'border-r-[2px] border-black' : ''}`} style={{ width: `${tierProgressPercent}%` }} />
                    </div>
                  </div>
                </div>

                {/* TENGAH: Total Poin (ringkas & compact) */}
                <div className="lg:px-5 py-5 lg:py-0 flex flex-col justify-between lg:w-[170px] lg:shrink-0">
                  <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Poin Arcade</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-primary border-[2px] border-black shadow-[1px_1px_0px_#000]" />
                  </div>
                  
                  <div className="flex flex-col items-center lg:items-start justify-center flex-grow py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-black leading-none" style={{ fontFamily: 'var(--font-sans)' }}>{totalArcadePoints.toFixed(1)}</span>
                      <span className="text-text-muted text-[10px] font-extrabold uppercase font-mono">pts</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 font-mono text-[10px] font-bold">
                    <div className="border-[2px] border-black rounded-md px-2 py-1 bg-surface-alt flex items-center justify-between">
                      <span>🎮 {totalCurrentGames} Game</span>
                      <span>{totalCurrentGames.toFixed(1)}</span>
                    </div>
                    <div className="border-[2px] border-black rounded-md px-2 py-1 bg-surface-alt flex items-center justify-between">
                      <span>🏅 {totalCurrentSkills} Skill</span>
                      <span>{(totalCurrentSkills * 0.5).toFixed(1)}</span>
                    </div>
                    {lastCompletedMilestone && (
                      <div className="border-[2px] border-black rounded-md px-2 py-1 bg-success/20 text-success flex items-center justify-between">
                        <span>🎁 Bonus</span>
                        <span>+{lastCompletedMilestone.bonus}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KANAN: Milestone chart + target */}
                <div className="lg:pl-6 pt-5 lg:pt-0 flex flex-col justify-between flex-1">
                  <div className="border-b-[2px] border-black pb-2.5 mb-4 flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">Target & Progres Milestone</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-secondary border-[2px] border-black shadow-[1px_1px_0px_#000]" />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5 flex-grow py-1">
                    <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r={radius} fill="transparent" stroke="var(--black)" strokeWidth={11} />
                        <circle cx="48" cy="48" r={radius} fill="transparent" stroke="var(--surface-alt)" strokeWidth={strokeWidth} />
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
                        <span className="text-[9px] text-text-muted font-bold uppercase mt-0.5">Milestone</span>
                      </div>
                    </div>

                    <div className="flex-grow w-full lg:max-w-[400px] space-y-3">
                      {nextMilestone ? (
                        <div className="text-xs font-bold text-black uppercase tracking-wide">
                          Target: <span className="text-secondary font-extrabold border-[2px] border-black bg-secondary/10 px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000]">{nextMilestone.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-success font-black uppercase tracking-wider border-[2px] border-black bg-success/20 px-2.5 py-1 rounded-lg shadow-[2px_2px_0px_#000] inline-block">ALL MILESTONES SECURED</span>
                      )}

                      {nextMilestone && (
                        <div className="space-y-2 font-mono text-xs font-bold">
                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>GAMES {totalCurrentGames}/{nextMilestone.games}</span>
                              <span className="text-secondary">{missingGames > 0 ? `-${missingGames}` : 'OK'}</span>
                            </div>
                            <div className="w-full h-3 bg-surface-alt border-[2px] border-black rounded-md mt-1 overflow-hidden shadow-[1px_1px_0px_#000]">
                              <div className={`h-full bg-primary animate-progress rounded-sm ${totalCurrentGames > 0 ? 'border-r-[2px] border-black' : ''}`} style={{ width: `${Math.min(100, (totalCurrentGames / nextMilestone.games) * 100)}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-text-muted">
                              <span>SKILLS {totalCurrentSkills}/{nextMilestone.skills}</span>
                              <span className="text-tertiary">{missingSkills > 0 ? `-${missingSkills}` : 'OK'}</span>
                            </div>
                            <div className="w-full h-3 bg-surface-alt border-[2px] border-black rounded-md mt-1 overflow-hidden shadow-[1px_1px_0px_#000]">
                              <div className={`h-full bg-tertiary animate-progress rounded-sm ${totalCurrentSkills > 0 ? 'border-r-[2px] border-black' : ''}`} style={{ width: `${Math.min(100, (totalCurrentSkills / nextMilestone.skills) * 100)}%`, animationDelay: '200ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                      MILESTONE ROADMAP
                    </span>
                    <span className="text-[10px] font-mono text-text-muted font-bold">{totalCurrentPoints.toFixed(1)} PTS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {milestones.map((m, idx) => {
                      const isCompleted = totalCurrentGames >= m.games && totalCurrentSkills >= m.skills;
                      const isNext = !isCompleted && (idx === 0 || (totalCurrentGames >= milestones[idx - 1].games && totalCurrentSkills >= milestones[idx - 1].skills));

                      // Hitung progres detail milestone harian
                      const gamesDone = Math.min(totalCurrentGames, m.games);
                      const skillsDone = Math.min(totalCurrentSkills, m.skills);
                      const totalDone = gamesDone + skillsDone;
                      const totalTarget = m.games + m.skills;
                      const completionPercent = Math.round((totalDone / totalTarget) * 100);

                      const colors = getMilestoneColors(idx);

                      return (
                        <div
                          key={m.name}
                          className={`relative p-3 border-[3px] border-black rounded-lg flex flex-col gap-2.5 transition-all overflow-hidden shadow-[3px_3px_0px_#000] ${
                            isCompleted
                              ? colors.cardBg
                              : isNext
                                ? 'bg-primary/15 border-black'
                                : 'bg-surface-alt border-black'
                          }`}
                        >
                          {/* Liquid wave background for 100% completed milestone */}
                          {isCompleted && (
                            <LiquidWave colorClass={colors.waveColor} milestoneIdx={idx} />
                          )}

                          <div className="flex items-center gap-2 relative z-10">
                            {/* Circle with liquid animation */}
                            <div className={`w-9 h-9 shrink-0 rounded-full border-[3px] border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_#000] relative bg-white overflow-hidden`}>
                              {isCompleted ? (
                                <CheckIcon className="w-5 h-5 text-success stroke-[3px] relative z-20" />
                              ) : (
                                <>
                                  {/* Wave Water Layer */}
                                  <div 
                                    className="absolute bottom-0 left-0 right-0 bg-primary/75 transition-all duration-1000 ease-out"
                                    style={{ height: `${completionPercent}%` }}
                                  >
                                    {completionPercent > 0 && completionPercent < 100 && (
                                      <div className="absolute bottom-[calc(100%-2px)] left-1/2 w-[220%] h-[220%] rounded-[38%] bg-white/70 animate-wave-spin" />
                                    )}
                                  </div>
                                  <span className="text-xs font-black font-mono relative z-20 text-black">
                                    {idx + 1}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <span className={`text-xs font-black uppercase tracking-wide truncate ${
                              isCompleted ? colors.textColor : 'text-black'
                            }`}>
                              {m.name}
                            </span>
                          </div>

                          {/* Live Progress Bars instead of static text */}
                          <div className="space-y-2.5 font-mono text-[10px] font-bold text-text-muted leading-none relative z-10">
                            <div className="text-black bg-surface-alt border-2 border-black rounded px-1.5 py-1 text-[9px] w-fit shadow-[1px_1px_0_#000]">
                              +{m.bonus} Bonus · Total {m.total} pt
                            </div>
                            
                            {/* Game progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-extrabold text-text-muted">
                                <span>GAMES</span>
                                <span className="text-black">{gamesDone}/{m.games}</span>
                              </div>
                              <div className="w-full h-2.5 bg-surface-alt border-[2px] border-black rounded overflow-hidden shadow-[1px_1px_0_#000]">
                                <div className="h-full bg-primary" style={{ width: `${(gamesDone / m.games) * 100}%` }} />
                              </div>
                            </div>

                            {/* Skill progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-extrabold text-text-muted">
                                <span>SKILLS</span>
                                <span className="text-black">{skillsDone}/{m.skills}</span>
                              </div>
                              <div className="w-full h-2.5 bg-surface-alt border-[2px] border-black rounded overflow-hidden shadow-[1px_1px_0_#000]">
                                <div className="h-full bg-tertiary" style={{ width: `${(skillsDone / m.skills) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KANAN: Activity Chart */}
                <div className="lg:pl-6 mt-6 lg:mt-0 border-t-[2px] border-black pt-6 lg:border-t-0 lg:pt-0">
                  <ActivityChart badges={badges} activeMonthPrefix={activeMonthPrefix} embedded />
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
                LIST TARGET BADGES BULAN INI: {activeMonthName.toUpperCase()}
              </span>
              <span className="text-[10px] text-text-muted font-mono font-bold">Wajib diselesaikan di periode ini</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targetJulyBadges.map((targetBadge, idx) => {
                const isEarned = monthlyBadges.some(b => b.badge_name.toLowerCase().includes(targetBadge.name.toLowerCase()));
                
                return (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setSelectedGameModal(targetBadge);
                      setCopied(false);
                    }}
                    className={`p-4 border-[3px] border-black rounded-lg flex items-center justify-between gap-4 transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000] animate-fade-slide-up text-left w-full ${
                      isEarned 
                        ? 'bg-success/10 border-success hover:border-success' 
                        : 'bg-white hover:border-zinc-800'
                    }`}
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div>
                      <h4 className="text-xs font-black tracking-wide uppercase flex items-center gap-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
                        {targetBadge.name}
                        <span className="text-[10px] text-text-muted font-normal lowercase">↗</span>
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FASTTRACK SUBTAB */}
        {activeSubTab === 'fasttrack' && (
          <div className="neobrutal-card animate-fade-slide-up space-y-6">
            {/* Header: Title and Search/Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-[2px] border-black pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono block">
                  FASTTRACK FOUNDATIONAL SKILL BADGES
                </span>
                <span className="text-xs text-text-muted font-mono font-bold">
                  {filteredSkills.length} Skill Badges Available
                </span>
              </div>
              
              {/* Search and Filter Inputs */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cari badge..."
                  value={skillsSearch}
                  onChange={(e) => setSkillsSearch(e.target.value)}
                  className="neobrutal-input py-2 text-xs w-full sm:w-48 font-mono"
                />
                <select
                  value={skillsDifficulty}
                  onChange={(e) => setSkillsDifficulty(e.target.value)}
                  className="neobrutal-input py-2 text-xs w-full sm:w-40 font-mono bg-white cursor-pointer"
                >
                  <option value="all">Semua Level</option>
                  <option value="introductory">Introductory</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Badges Grid */}
            {isLoadingSkills ? (
              <div className="py-12 text-center font-mono text-xs text-text-muted">
                Memuat daftar skill badges...
              </div>
            ) : paginatedBadges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedBadges.map((skill, idx) => {
                  const isEarned = monthlyBadges.some(b => 
                    b.badge_name.toLowerCase().replace(/\s+/g, '') === skill.name.toLowerCase().replace(/\s+/g, '') ||
                    b.badge_name.toLowerCase().includes(skill.name.toLowerCase()) ||
                    skill.name.toLowerCase().includes(b.badge_name.toLowerCase())
                  );

                  return (
                    <div 
                      key={skill.id} 
                      className={`p-4 border-[3px] border-black rounded-lg flex flex-col justify-between gap-4 transition-all shadow-[4px_4px_0px_#000] ${
                        isEarned 
                          ? 'bg-success/10 border-success' 
                          : 'bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black tracking-wide uppercase leading-snug" style={{ fontFamily: 'var(--font-sans)' }}>
                            {skill.name}
                          </h4>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border-[2px] border-black rounded shrink-0 ${
                            isEarned 
                              ? 'text-white bg-success' 
                              : 'text-white bg-secondary'
                          }`}>
                            {isEarned ? 'DONE' : 'PENDING'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[9px] font-bold text-text-muted uppercase">
                          {skill.difficulty && (
                            <span className="border-[2px] border-black px-1.5 py-0.5 rounded bg-surface-alt">
                              {skill.difficulty}
                            </span>
                          )}
                          {skill.cost && (
                            <span className="border-[2px] border-black px-1.5 py-0.5 rounded bg-surface-alt">
                              💰 {skill.cost}
                            </span>
                          )}
                          {skill.labs !== undefined && skill.labs > 0 && (
                            <span className="border-[2px] border-black px-1.5 py-0.5 rounded bg-surface-alt">
                              🧪 {skill.labs} Labs
                            </span>
                          )}
                          {skill.duration && (
                            <span className="border-[2px] border-black px-1.5 py-0.5 rounded bg-surface-alt">
                              ⏱️ {skill.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className="text-[10px] font-mono font-bold text-text-muted">
                          Bobot: 0.5 pts
                        </span>
                        <a
                          href={skill.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`neobrutal-btn-secondary px-3 py-1.5 text-[10px] font-black tracking-wider uppercase block shrink-0 ${
                            isEarned ? 'opacity-70 hover:translate-y-0 hover:shadow-[2px_2px_0px_#000]' : ''
                          }`}
                        >
                          {isEarned ? 'Lihat Lab' : 'Mulai ↗'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center border-[2px] border-dashed border-black font-mono text-xs text-text-muted rounded-lg">
                Tidak ada skill badge yang cocok dengan pencarian atau filter.
              </div>
            )}

            {/* Pagination */}
            {!isLoadingSkills && totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-2 font-mono text-xs">
                <button 
                  onClick={() => setFasttrackPage(prev => Math.max(1, prev - 1))}
                  disabled={fasttrackPage === 1}
                  className="neobrutal-btn-primary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[2px_2px_0px_#000]"
                >
                  Prev
                </button>
                <span className="font-black text-black">Page {fasttrackPage} of {totalPages}</span>
                <button 
                  onClick={() => setFasttrackPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={fasttrackPage === totalPages}
                  className="neobrutal-btn-primary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[2px_2px_0px_#000]"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRACK BADGE SUBTAB */}
        {activeSubTab === 'track_badge' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start animate-fade-slide-up">
            <div className="xl:col-span-2 neobrutal-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[2px] border-black pb-2.5 mb-4">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">COLLECTED ASSETS</span>
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
                <div className="border-b-[2px] border-black pb-2.5 mb-4"><span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono">TELEMETRY TIMELINE</span></div>
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

      {selectedGameModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="neobrutal-card max-w-sm w-full bg-surface border-[3px] border-black p-6 space-y-4 animate-scale-in">
            <div className="border-b-[2px] border-black pb-3">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold font-mono block mb-1">
                ACCESS CODE GAME
              </span>
              <h3 className="text-lg font-black uppercase text-black" style={{ fontFamily: 'var(--font-sans)' }}>
                {selectedGameModal.name}
              </h3>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] uppercase tracking-widest text-text-muted font-bold font-mono block">
                Access Code:
              </span>
              <div className="flex gap-2">
                <div className="flex-1 bg-surface-alt border-[3px] border-black p-3 font-mono font-black text-center text-sm rounded-lg tracking-wider text-primary select-all select-none">
                  {selectedGameModal.accessCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedGameModal.accessCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="neobrutal-btn-primary px-4 py-2.5 text-xs font-bold uppercase transition-all duration-150 shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-text-muted font-mono leading-relaxed">
              Salin kode di atas sebelum memulai. Anda harus memasukkan kode akses ini saat mendaftar game di platform Google Skills Boost.
            </p>

            <div className="pt-2 space-y-3">
              <a
                href={selectedGameModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelectedGameModal(null)}
                className="neobrutal-btn-secondary w-full text-center py-3 text-xs font-black tracking-wider uppercase block"
              >
                START GAME ↗
              </a>
              <button
                onClick={() => setSelectedGameModal(null)}
                className="w-full text-center font-mono text-[10px] text-text-muted font-bold uppercase hover:underline hover:text-black transition-colors block py-1"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
