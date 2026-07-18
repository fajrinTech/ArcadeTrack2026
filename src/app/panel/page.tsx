'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { 
  UpdateIcon, 
  ExclamationTriangleIcon, 
  CheckCircledIcon, 
  ArrowLeftIcon, 
  UploadIcon,
  Cross2Icon,
  TrashIcon
} from '@radix-ui/react-icons';
import Link from 'next/link';

interface FacilitatorMember {
  id: string;
  facilitator_id: string;
  name: string;
  email?: string | null;
  profile_url: string;
  games_count: number;
  skills_count: number;
  monthly_points: number;
  last_synced?: string | null;
  created_at: string;
}

interface ParsedMember {
  name: string;
  email?: string;
  profile_url: string;
  is_url_valid: boolean;
  games_count: number;
  skills_count: number;
  monthly_points: number;
}

function normalizeProfileUrlClient(url: string): string | null {
  const trimmed = url.trim();
  if ((trimmed.match(/https?:\/\//gi) || []).length > 1) {
    return null;
  }
  const match = trimmed.match(/(?:skills\.google|cloudskillsboost\.google)\/public_profiles\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (!match) return null;
  return `https://www.skills.google/public_profiles/${match[1].toLowerCase()}`;
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    lines.push(row);
  }
  return lines;
}

export default function PanelFasilPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [facilId, setFacilId] = useState('');
  const [facilName, setFacilName] = useState('');

  const [participants, setParticipants] = useState<FacilitatorMember[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // CSV states
  const [parsedData, setParsedData] = useState<ParsedMember[]>([]);
  const [modalStats, setModalStats] = useState({
    total: 0,
    invalidUrls: 0,
    totalGames: 0,
    totalSkills: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [visibleCount, setVisibleCount] = useState(100);

  useEffect(() => {
    setVisibleCount(100);
  }, [searchQuery]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const savedId = localStorage.getItem('myProfileId');
    if (!savedId) {
      setLoadingAuth(false);
      return;
    }

    try {
      const res = await fetch(`/api/participants/${savedId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.participant && data.participant.role === 'facilitator') {
          setIsAuthorized(true);
          setFacilId(savedId);
          setFacilName(data.participant.name);
          fetchFacilitatorMembers(savedId);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchFacilitatorMembers = async (facilitatorId: string) => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/facilitator-members?facilitator_id=${facilitatorId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      toast('Gagal mengambil daftar peserta bimbingan.', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = parseCSV(text);
        if (lines.length < 2) {
          toast('Format file CSV kosong atau tidak valid.', 'error');
          return;
        }

        const headers = lines[0].map(h => h.toLowerCase().trim());
        const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('learner'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('surel'));
        const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('profile') || h.includes('profil') || h.includes('link'));
        const gamesIdx = headers.findIndex(h => (h.includes('game') || h.includes('games') || h.includes('arcade')) && !h.includes('nama') && !h.includes('name'));
        const skillsIdx = headers.findIndex(h => (h.includes('skill') || h.includes('keahlian') || h.includes('lencana')) && !h.includes('nama') && !h.includes('name') && !h.includes('gear') && !h.includes('url') && !h.includes('profil') && !h.includes('link'));

        if (urlIdx === -1) {
          toast('Kolom URL Profil tidak ditemukan dalam CSV.', 'error');
          return;
        }

        const list: ParsedMember[] = [];
        let invalidUrls = 0;
        let totalGames = 0;
        let totalSkills = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length < urlIdx + 1) continue; // Skip empty rows

          const name = nameIdx !== -1 ? row[nameIdx] : 'Google Cloud Learner';
          const email = emailIdx !== -1 ? row[emailIdx] : '';
          const rawUrl = row[urlIdx] || '';
          const normalizedUrl = normalizeProfileUrlClient(rawUrl);

          const gamesVal = gamesIdx !== -1 ? parseInt(row[gamesIdx], 10) : 0;
          const skillsVal = skillsIdx !== -1 ? parseInt(row[skillsIdx], 10) : 0;

          const gamesCount = isNaN(gamesVal) ? 0 : gamesVal;
          const skillsCount = isNaN(skillsVal) ? 0 : skillsVal;

          if (!normalizedUrl) {
            invalidUrls++;
          }

          totalGames += gamesCount;
          totalSkills += skillsCount;

          list.push({
            name: name || 'Google Cloud Learner',
            email: email || undefined,
            profile_url: normalizedUrl || rawUrl,
            is_url_valid: !!normalizedUrl,
            games_count: gamesCount,
            skills_count: skillsCount,
            monthly_points: gamesCount + skillsCount * 0.5
          });
        }

        if (list.length === 0) {
          toast('Tidak ada data peserta yang valid dalam CSV.', 'error');
          return;
        }

        setParsedData(list);
        setModalStats({
          total: list.length,
          invalidUrls,
          totalGames,
          totalSkills,
        });
        setIsModalOpen(true);
      } catch (err) {
        console.error('CSV Parsing error:', err);
        toast('Gagal memproses file CSV.', 'error');
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/facilitator-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilitator_id: facilId, members: parsedData })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan data.');
      }

      const data = await res.json();
      toast(`Berhasil mengimpor/memperbarui ${data.count} peserta!`, 'success');
      setIsModalOpen(false);
      fetchFacilitatorMembers(facilId);
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Terjadi kesalahan saat mengimpor.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSyncAll = async () => {
    // Saring dan batasi maksimal 100 (visibleCount) yang sedang ditampilkan untuk disinkronkan
    const targetSyncs = participants
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0))
      .slice(0, visibleCount);

    if (targetSyncs.length === 0 || isSyncingAll) return;
    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: targetSyncs.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetSyncs.length; i++) {
      const p = targetSyncs[i];
      setSyncProgress({ current: i + 1, total: targetSyncs.length });
      
      try {
        const res = await fetch(`/api/facilitator-members/${p.id}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.member) {
            successCount++;
            setParticipants(prev => prev.map(item => item.id === p.id ? data.member : item));
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Error syncing participant ${p.name}:`, err);
        failCount++;
      }
    }

    setIsSyncingAll(false);
    if (failCount > 0) {
      toast(`Sync selesai. Sukses: ${successCount}, Gagal: ${failCount}.`, 'info');
    } else {
      toast(`Berhasil menyinkronkan ${successCount} peserta!`, 'success');
    }
  };

  const handleSyncParticipant = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/facilitator-members/${id}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyinkronkan data.');
      }
      toast('Profil berhasil disinkronkan.', 'success');
      fetchFacilitatorMembers(facilId);
    } catch (err: any) {
      toast(err.message || 'Gagal menyinkronkan data.', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteParticipant = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus peserta "${name}"?`)) return;

    try {
      const res = await fetch(`/api/facilitator-members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus peserta.');
      }
      toast('Peserta berhasil dihapus.', 'success');
      fetchFacilitatorMembers(facilId);
    } catch (err: any) {
      toast(err.message || 'Gagal menghapus peserta.', 'error');
    }
  };

  const filteredParticipants = participants
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => (b.monthly_points ?? 0) - (a.monthly_points ?? 0));

  const displayedParticipants = filteredParticipants.slice(0, visibleCount);

  if (loadingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center font-mono text-xs">
        <UpdateIcon className="w-5 h-5 animate-spin mr-2" />
        <span>MEMVALIDASI OTORISASI...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-dvh flex flex-col justify-center items-center pb-12 px-4">
        <div className="max-w-md w-full animate-scale-in">
          <div className="neobrutal-card text-center p-6 md:p-8 space-y-6">
            <div className="w-14 h-14 rounded-lg overflow-hidden border-[3px] border-black mx-auto shadow-[3px_3px_0px_#000]">
              <img src="/500px.png" alt="Arcade Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-extrabold text-black uppercase">
              Akses Ditolak
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Halaman ini hanya dapat diakses oleh akun dengan peran <strong>Fasilitator</strong>. Silakan kembali dan login menggunakan profil Fasilitator Anda.
            </p>
            <div className="pt-4 border-t-[3px] border-black">
              <Link href="/" className="neobrutal-btn-primary block text-center">
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalBimbingan = participants.length;
  const averagePoints = totalBimbingan > 0
    ? (participants.reduce((acc, curr) => acc + (curr.monthly_points ?? 0), 0) / totalBimbingan)
    : 0;
  const totalGames = participants.reduce((acc, curr) => acc + (curr.games_count ?? 0), 0);
  const totalSkills = participants.reduce((acc, curr) => acc + (curr.skills_count ?? 0), 0);

  return (
    <div className="min-h-dvh flex flex-col pb-12 font-mono">
      <div className="max-w-4xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">
        
        {/* Header / Nav */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000] animate-fade-slide-up">
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
            {participants.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll || syncingId !== null || isImporting}
                className="neobrutal-btn-secondary !bg-secondary hover:!bg-secondary-dark flex items-center gap-2 py-3 px-4 text-xs font-bold text-white shadow-[4px_4px_0px_#000] border-[3px] border-black rounded-lg transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                <UpdateIcon className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                {isSyncingAll ? (
                  <span>SYNC ({syncProgress.current}/{syncProgress.total})</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">SYNC SEMUA</span>
                    <span className="inline sm:hidden">SYNC ALL</span>
                  </>
                )}
              </button>
            )}
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-file-upload"
            />
            <label 
              htmlFor="csv-file-upload"
              className="neobrutal-btn-primary flex items-center gap-2 cursor-pointer justify-center w-full sm:w-auto"
            >
              <UploadIcon className="w-4 h-4" />
              <span>UPLOAD CSV ARCADE</span>
            </label>
          </div>
        </div>

        {/* Dashboard statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-slide-up">
          <div className="neobrutal-card p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-muted">Total Bimbingan</span>
            <span className="text-2xl font-black text-black mt-2">{totalBimbingan}</span>
          </div>
          <div className="neobrutal-card p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-text-muted">Rata-rata Poin</span>
            <span className="text-2xl font-black text-tertiary mt-2">
              {averagePoints.toFixed(1)}
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

        {/* Milestone Progress Tracker */}
        <div className="neobrutal-card space-y-4 animate-fade-slide-up">
          <div className="border-b-[2px] border-black pb-2.5">
            <h2 className="text-sm font-black uppercase text-black">Berikut progres milestonemu sebagai Fasilitator!</h2>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              Lihat progres untuk 4 milestonemu di bawah ini. Ingat, semakin cepat peserta menyelesaikan alur belajar mereka, semakin cepat milestone akan tercapai dan hadiah untuk milestone tersebut akan terbuka.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
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
            ].map(m => {
              const currentTotal = totalGames + totalSkills;
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
                    {/* Progress Bar Container with matching colored border */}
                    <div className={`w-full h-4 rounded-full border-[2.5px] ${m.borderColor} bg-white overflow-hidden p-0.5 shadow-[1.5px_1.5px_0px_#000]`}>
                      <div 
                        className={`h-full rounded-full ${m.barColor} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Percentage & Count details */}
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

        {/* Participants Table */}
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
                            {p.email && (
                              <span className="text-[9px] text-text-muted font-normal font-mono lowercase">
                                {p.email}
                              </span>
                            )}
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
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleSyncParticipant(p.id)}
                              disabled={syncingId !== null}
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
                    onClick={() => setVisibleCount(prev => prev + 100)}
                    className="px-4 py-2 border-[2.5px] border-black rounded text-xs font-bold bg-white hover:bg-surface-alt active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] shadow-[2.5px_2.5px_0px_#000] transition-all"
                  >
                    MUAT 100 PESERTA LAGI ({filteredParticipants.length - visibleCount} TERSISA)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSV Verification Modal (Screenshot Layout matching) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
          <div className="neobrutal-card max-w-sm sm:max-w-md w-full !p-4 sm:!p-6 flex flex-col animate-scale-in bg-white shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-[3px] border-black pb-3 shrink-0">
              <h3 className="text-base font-black text-black uppercase">
                Verifikasi Data CSV
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 border-[2px] border-black rounded bg-white hover:bg-secondary hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1.5px_1.5px_0px_#000] transition-all"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: The custom metrics table matching the screenshot */}
            <div className="my-4 sm:my-6 space-y-4">
              <p className="text-xs text-text-muted leading-relaxed">
                Berikut adalah ringkasan analisis file CSV dari Arcade Global. Pastikan nilai-nilai ini akurat sebelum menyimpan ke database.
              </p>

              <div className="overflow-hidden border-[3px] border-black rounded shadow-[4px_4px_0px_#000]">
                <table className="w-full border-collapse text-xs text-center font-mono">
                  <thead>
                    <tr className="bg-[#2196F3] text-white border-b-[3px] border-black">
                      <th className="py-2.5 px-4 border-r-[3px] border-black font-extrabold text-left">Metrik</th>
                      <th className="py-2.5 px-4 font-extrabold w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black text-black">
                    <tr className="bg-white">
                      <td className="py-2.5 px-4 border-r-[3px] border-black text-left text-[11px]">Jumlah peserta yang terdaftar</td>
                      <td className="py-2.5 px-4 font-black">{modalStats.total}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-2.5 px-4 border-r-[3px] border-black text-left text-[11px]">Jumlah peserta dengan URL profil Skills yang salah</td>
                      <td className="py-2.5 px-4 font-black text-secondary">{modalStats.invalidUrls}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-2.5 px-4 border-r-[3px] border-black text-left text-[11px]">Total Game Badges</td>
                      <td className="py-2.5 px-4 font-black">{modalStats.totalGames}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-2.5 px-4 border-r-[3px] border-black text-left text-[11px]">Total Skill badges</td>
                      <td className="py-2.5 px-4 font-black">{modalStats.totalSkills}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {modalStats.invalidUrls > 0 && (
                <div className="text-[10px] text-white bg-secondary border-[2.5px] border-black p-3 flex items-start gap-2 font-bold rounded shadow-[2px_2px_0_#000]">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Ditemukan {modalStats.invalidUrls} baris peserta dengan format URL profil tidak valid. Nilai/poin mereka akan tetap diimpor, namun Anda disarankan memverifikasi profil mereka nanti.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t-[3px] border-black flex items-center justify-end gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isImporting}
                className="px-4 py-2 border-[2.5px] border-black rounded text-xs font-bold bg-white hover:bg-surface-alt active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] shadow-[2.5px_2.5px_0px_#000] transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="neobrutal-btn-primary !py-2 !px-3 sm:!px-4 flex items-center gap-1.5 text-xs font-bold shrink-0"
              >
                {isImporting ? (
                  <>
                    <UpdateIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>MENYIMPAN...</span>
                  </>
                ) : (
                  <>
                    <CheckCircledIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">KONFIRMASI & </span><span>SIMPAN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
