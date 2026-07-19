'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { UpdateIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

// Subcomponents
import HeaderNav from './components/HeaderNav';
import StatsCards from './components/StatsCards';
import MilestoneProgress from './components/MilestoneProgress';
import MemberListTable from './components/MemberListTable';
import ImportCSVModal from './components/ImportCSVModal';

// Utilities
import { parseCSV, escapeExcelHtml, normalizeProfileUrlClient } from './utils';

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
  const [systemLock, setSystemLock] = useState<{ locked: boolean; by?: string }>({ locked: false });

  const checkSyncLock = async () => {
    try {
      const res = await fetch('/api/sync-lock');
      if (res.ok) {
        const data = await res.json();
        setSystemLock(data);
      }
    } catch (err) {
      console.error('Error checking sync lock:', err);
    }
  };

  const [prevLocked, setPrevLocked] = useState(false);

  useEffect(() => {
    checkSyncLock();
    const interval = setInterval(checkSyncLock, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prevLocked && !systemLock.locked) {
      toast('System berhasil sync', 'success');
      if (facilId) {
        fetchFacilitatorMembers(facilId);
      }
    }
    setPrevLocked(!!systemLock.locked);
  }, [systemLock.locked, prevLocked, facilId]);

  useEffect(() => {
    if (isSyncingAll && systemLock.locked && systemLock.by !== facilName) {
      setIsSyncingAll(false);
      toast('Sinkronisasi dihentikan oleh System.', 'error');
    }
  }, [systemLock, isSyncingAll, facilName]);

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

  const handleExportCSV = async () => {
    if (participants.length === 0) return;

    const totalGames = participants.reduce((sum, p) => sum + (p.games_count || 0), 0);
    const totalSkills = participants.reduce((sum, p) => sum + (p.skills_count || 0), 0);
    const totalPoints = participants.reduce((sum, p) => sum + (p.monthly_points || 0), 0);
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    const borderStyle = 'border:1px solid #D1D5DB;';
    const baseFont = 'font-family:Calibri, Arial, sans-serif;';

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Laporan Progres</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
     <x:FreezePanes/>
     <x:FrozenNoSplit/>
     <x:SplitHorizontal>5</x:SplitHorizontal>
     <x:TopRowBottomPane>5</x:TopRowBottomPane>
     <x:ActivePane>2</x:ActivePane>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  td { vertical-align: middle; }
</style>
</head>
<body style="${baseFont}">
<table>
  <!-- Row 1: Title (Dark Grey Header) -->
  <tr style="height:35px;">
    <td colspan="5" style="background-color:#1F2937; color:#FFFFFF; font-size:15px; font-weight:bold; text-align:center; ${borderStyle}">
      LAPORAN PROGRES BELAJAR GOOGLE ARCADE 2026
    </td>
  </tr>
  
  <!-- Row 2: Metadata (Light Grey Header) -->
  <tr style="height:25px; background-color:#F3F4F6; font-size:11px; color:#4B5563;">
    <td colspan="2" style="font-weight:bold; text-align:left; padding-left:10px; ${borderStyle}">
      Fasilitator: ${escapeExcelHtml(facilName)}
    </td>
    <td colspan="3" style="text-align:right; padding-right:10px; ${borderStyle}">
      Unduh: ${escapeExcelHtml(dateStr)} WIB
    </td>
  </tr>
  
  <!-- Row 3: Statistics Row (Green Theme) -->
  <tr style="height:28px; background-color:#EBF5FF; font-size:11px; font-weight:bold; text-align:center;">
    <td style="background-color:#DEF7EC; color:#03543F; ${borderStyle}">
      Total Peserta: ${participants.length}
    </td>
    <td style="background-color:#E1EFFE; color:#1E429F; ${borderStyle}">
      Rata-rata Poin: ${(participants.length > 0 ? totalPoints / participants.length : 0).toFixed(1)}
    </td>
    <td style="background-color:#FEF08A; color:#713F12; ${borderStyle}">
      Total Games: ${totalGames}
    </td>
    <td style="background-color:#FCE8E6; color:#9B1C1C; ${borderStyle}">
      Total Skills: ${totalSkills}
    </td>
    <td style="background-color:#F3F4F6; ${borderStyle}"></td>
  </tr>

  <tr style="height:15px;">
    <td colspan="5" style="background-color:#FFFFFF; ${borderStyle}"></td>
  </tr>

  <!-- Row 5: Table Header (Blue Header) -->
  <tr style="height:28px; background-color:#1E40AF; color:#FFFFFF; font-size:11px; font-weight:bold; text-align:center;">
    <th style="width:50px; ${borderStyle}">NO</th>
    <th style="width:250px; text-align:left; padding-left:8px; ${borderStyle}">NAMA PESERTA</th>
    <th style="width:120px; ${borderStyle}">TOTAL GAME BADGES</th>
    <th style="width:120px; ${borderStyle}">TOTAL SKILL BADGES</th>
    <th style="width:120px; background-color:#F59E0B; color:#FFFFFF; ${borderStyle}">TOTAL POIN</th>
  </tr>
`;

    participants.forEach((p, idx) => {
      const isEven = idx % 2 === 1;
      const rowBg = isEven ? 'background-color:#F9FAFB;' : 'background-color:#FFFFFF;';
      const poinHighlight = 'background-color:#FEF3C7; font-weight:bold; color:#B45309;';

      html += `
  <tr style="height:24px; ${rowBg} font-size:11px; text-align:center;">
    <td style="${borderStyle}">${idx + 1}</td>
    <td style="text-align:left; padding-left:8px; font-weight:bold; ${borderStyle}">
      ${escapeExcelHtml(p.name)}
    </td>
    <td style="${borderStyle}">${p.games_count || 0}</td>
    <td style="${borderStyle}">${p.skills_count || 0}</td>
    <td style="${poinHighlight} ${borderStyle}">
      ${(p.monthly_points || 0).toFixed(1)}
    </td>
  </tr>
`;
    });

    html += `
</table>
</body>
</html>
`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Progres_Fasil_${facilName.replace(/\s+/g, '_')}.xls`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
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
        const urlIdx = headers.findIndex(h =>
          (h.includes('url') || h.includes('profile') || h.includes('profil') || h.includes('link')) &&
          !h.includes('status') &&
          !h.includes('developer')
        );
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
          const email = emailIdx !== -1 ? row[emailIdx].toLowerCase().trim() : '';
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
    // Prioritaskan peserta yang belum pernah di-sync (last_synced null),
    // diikuti oleh yang paling lama belum di-sync (last_synced paling tua).
    // Batasi maksimal 100 per sekali batch sync agar tidak kena timeout/rate limit.
    const targetSyncs = [...participants]
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => {
        if (!a.last_synced && b.last_synced) return -1;
        if (a.last_synced && !b.last_synced) return 1;
        if (!a.last_synced && !b.last_synced) return 0;
        return new Date(a.last_synced!).getTime() - new Date(b.last_synced!).getTime();
      })
      .slice(0, 100);

    if (targetSyncs.length === 0 || isSyncingAll) return;

    // Acquire lock
    try {
      const lockRes = await fetch('/api/sync-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acquire', holder: facilName })
      });
      if (lockRes.ok) {
        const lockData = await lockRes.json();
        if (!lockData.success) {
          toast(`Gagal: Sinkronisasi sedang dilakukan oleh ${lockData.lockedBy || 'peserta lain'}`, 'error');
          return;
        }
      } else {
        toast('Gagal mengamankan sinkronisasi sistem.', 'error');
        return;
      }
    } catch (err) {
      toast('Gagal terhubung ke sistem penguncian.', 'error');
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: targetSyncs.length });

    let successCount = 0;
    let failCount = 0;
    let lockLost = false;

    try {
      for (let i = 0; i < targetSyncs.length; i++) {
        const p = targetSyncs[i];
        setSyncProgress({ current: i + 1, total: targetSyncs.length });

        // Heartbeat lock check
        try {
          const hbRes = await fetch('/api/sync-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'heartbeat', holder: facilName })
          });
          if (hbRes.ok) {
            const hbData = await hbRes.json();
            if (!hbData.success) {
              lockLost = true;
              break;
            }
          } else {
            lockLost = true;
            break;
          }
        } catch (hbErr) {
          lockLost = true;
          break;
        }

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
    } finally {
      setIsSyncingAll(false);
      // Release lock
      try {
        await fetch('/api/sync-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', holder: facilName })
        });
      } catch (releaseErr) {
        console.error('Error releasing lock:', releaseErr);
      }

      // Update lock state immediately
      checkSyncLock();

      if (lockLost) {
        toast('Sinkronisasi dihentikan oleh System.', 'error');
      } else {
        if (failCount > 0) {
          toast(`Sync selesai. Sukses: ${successCount}, Gagal: ${failCount}.`, 'info');
        } else {
          toast(`Berhasil menyinkronkan ${successCount} peserta!`, 'success');
        }
      }
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
        <span>MEMUAT PANEL FASILITATOR...</span>
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

        <HeaderNav
          facilName={facilName}
          hasParticipants={participants.length > 0}
          isSyncingAll={isSyncingAll}
          syncProgress={syncProgress}
          syncingId={syncingId}
          isImporting={isImporting}
          onSyncAll={handleSyncAll}
          onExportCSV={handleExportCSV}
          onFileUpload={handleFileUpload}
          fileInputRef={fileInputRef}
          systemLock={systemLock}
        />

        <StatsCards
          totalBimbingan={totalBimbingan}
          averagePoints={averagePoints}
          totalGames={totalGames}
          totalSkills={totalSkills}
        />

        <MilestoneProgress
          totalGames={totalGames}
          totalSkills={totalSkills}
        />

        <MemberListTable
          loadingList={loadingList}
          totalBimbingan={totalBimbingan}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filteredParticipants={filteredParticipants}
          displayedParticipants={displayedParticipants}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount(prev => prev + 100)}
          syncingId={syncingId}
          onSyncParticipant={handleSyncParticipant}
          onDeleteParticipant={handleDeleteParticipant}
        />

      </div>

      <ImportCSVModal
        isOpen={isModalOpen}
        isImporting={isImporting}
        modalStats={modalStats}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
}
