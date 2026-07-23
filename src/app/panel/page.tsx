'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { UpdateIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

// Subcomponents
import HeaderNav from './components/HeaderNav';
import StatsCards from './components/StatsCards';
import MilestoneProgress from './components/MilestoneProgress';
import MemberListTable from './components/MemberListTable';
import ImportCSVModal from './components/ImportCSVModal';
import ConfirmModal from './components/ConfirmModal';
import { APP_VERSION } from '@/lib/version';

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
  created_by_batch_id?: string | null;
  sync_status?: 'belum' | 'sukses' | 'gagal' | 'pending';
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
  const [facilProfileUrl, setFacilProfileUrl] = useState('');

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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  // Advanced States
  const [uploadFilename, setUploadFilename] = useState('');
  const [isDuplicateFile, setIsDuplicateFile] = useState(false);
  interface UploadBatch {
    id: string;
    facilitator_id: string;
    filename: string;
    records_count: number;
    status: 'completed' | 'rolled_back';
    uploaded_at: string;
  }
  const [uploadHistory, setUploadHistory] = useState<UploadBatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
    showCancel?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const checkSyncLock = async () => {
    try {
      const res = await fetch('/api/sync-lock');
      if (res.ok) {
        const data = await res.json();
        setSystemLock(data);
        setIsMaintenance(!!data.maintenance);

        // Auto-update notification modal
        if (data.version && data.version !== APP_VERSION) {
          setConfirmConfig({
            isOpen: true,
            title: 'Pembaruan Sistem Tersedia',
            message: `Sistem versi terbaru (${data.version}) telah dirilis untuk perbaikan performa & bug sinkronisasi. Silakan klik tombol di bawah untuk memuat ulang halaman.`,
            confirmText: 'Muat Ulang Halaman',
            type: 'warning',
            showCancel: false,
            onConfirm: () => {
              window.location.reload();
            }
          });
        }
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
    if (isSyncingAll && systemLock.locked && systemLock.by === 'Mentor Utama') {
      setIsSyncingAll(false);
      toast('Sinkronisasi dihentikan karena Mentor Utama melakukan Master Sync.', 'error');
    }
  }, [systemLock, isSyncingAll]);

  const ANDRE_GREGORI_ID = '08fcca20-05e8-423f-ad34-43a14816c0b4';
  const isAndre = facilId === ANDRE_GREGORI_ID;

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
      if (res.status === 401) {
        setShowSessionExpired(true);
        setLoadingAuth(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.participant && data.participant.role === 'facilitator') {
          setIsAuthorized(true);
          setFacilId(savedId);
          setFacilName(data.participant.name);
          setFacilProfileUrl(data.participant.profile_url || '');
          fetchFacilitatorMembers(savedId);
          fetchUploadHistory(savedId);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchUploadHistory = async (facilitatorId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/facilitator-members/upload-history?facilitator_id=${facilitatorId}`);
      if (res.ok) {
        const data = await res.json();
        setUploadHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching upload history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRollbackUpload = async (batchId: string, filename: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Rollback Unggahan CSV',
      message: `Apakah Anda yakin ingin melakukan rollback untuk file "${filename}"? Tindakan ini akan menghapus seluruh data peserta BARU yang di-import dari file ini. Data lama yang diperbarui tidak akan dihapus.`,
      confirmText: 'Ya, Hapus Data Baru',
      cancelText: 'Batal',
      type: 'danger',
      showCancel: true,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/facilitator-members/rollback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facilitator_id: facilId, batch_id: batchId })
          });
          if (res.ok) {
            const data = await res.json();
            toast(`Rollback sukses! Menghapus ${data.deletedCount} peserta baru.`, 'success');
            fetchFacilitatorMembers(facilId);
            fetchUploadHistory(facilId);
          } else {
            const err = await res.json();
            toast(err.error || 'Gagal rollback.', 'error');
          }
        } catch (err) {
          console.error(err);
          toast('Terjadi kesalahan saat rollback.', 'error');
        }
      }
    });
  };

  const fetchFacilitatorMembers = async (facilitatorId: string) => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/facilitator-members?facilitator_id=${facilitatorId}`);
      if (res.status === 401) {
        setShowSessionExpired(true);
        setLoadingList(false);
        return;
      }
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

    setUploadFilename(file.name);

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

        const isDup = uploadHistory.some(
          h => h.filename.toLowerCase() === file.name.toLowerCase() &&
               h.records_count === list.length &&
               h.status === 'completed'
        );

        setIsDuplicateFile(isDup);
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
        body: JSON.stringify({ facilitator_id: facilId, members: parsedData, filename: uploadFilename })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan data.');
      }

      const data = await res.json();
      toast(`Berhasil mengimpor/memperbarui ${data.count} peserta!`, 'success');
      setIsModalOpen(false);
      fetchFacilitatorMembers(facilId);
      fetchUploadHistory(facilId);
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
    // Batasi maksimal 1000 untuk Andre Gregori Sangari (khusus), atau 100 untuk fasil lainnya.
    const maxBatch = isAndre ? 1000 : 100;
    const targetSyncs = [...participants]
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => {
        if (!a.last_synced && b.last_synced) return -1;
        if (a.last_synced && !b.last_synced) return 1;
        if (!a.last_synced && !b.last_synced) return 0;
        return new Date(a.last_synced!).getTime() - new Date(b.last_synced!).getTime();
      })
      .slice(0, maxBatch);

    if (targetSyncs.length === 0 || isSyncingAll) return;

    // Check if system is locked by Mentor Utama
    if (systemLock.locked && systemLock.by === 'Mentor Utama') {
      toast('Gagal: Sinkronisasi sedang dikunci oleh Mentor Utama.', 'error');
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: targetSyncs.length });

    let successCount = 0;
    let failCount = 0;

    const concurrency = isAndre ? 5 : 1;
    const delayMs = isAndre ? 200 : 500;
    let completedCount = 0;
    let index = 0;
    let isStoppedByLock = false;

    const worker = async () => {
      while (index < targetSyncs.length && !isStoppedByLock) {
        const i = index++;
        if (i >= targetSyncs.length) break;

        const p = targetSyncs[i];

        // Check lock status in between loops to see if Mentor Utama started a sync
        if (i % 10 === 0) {
          try {
            const checkRes = await fetch('/api/sync-lock');
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.locked && checkData.by === 'Mentor Utama') {
                isStoppedByLock = true;
                toast('Sinkronisasi dihentikan karena Mentor Utama memulai Master Sync.', 'error');
                break;
              }
            }
          } catch (lockErr) {
            console.error('Error checking sync lock in loop:', lockErr);
          }
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

        completedCount++;
        setSyncProgress({ current: completedCount, total: targetSyncs.length });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    };

    try {
      const workers = Array.from({ length: concurrency }, () => worker());
      await Promise.all(workers);
    } finally {
      setIsSyncingAll(false);
      await fetchFacilitatorMembers(facilId);
      if (failCount > 0) {
        toast(`Sync selesai. Sukses: ${successCount}, Gagal: ${failCount}.`, 'info');
      } else {
        toast(`Berhasil menyinkronkan ${successCount} peserta!`, 'success');
      }
    }
  };

  const handleSendEmailProgress = async () => {
    const hasEmails = participants.some(p => p.email && p.email.trim() !== '');
    if (!hasEmails) {
      toast('Tidak ada peserta dengan alamat email terdaftar.', 'error');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Kirim Email Massal',
      message: 'Apakah Anda yakin ingin mengirim laporan progres mingguan ke SEMUA email peserta bimbingan Anda?',
      confirmText: 'Kirim Sekarang',
      type: 'info',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setIsSendingEmail(true);
        try {
          const res = await fetch('/api/admin/send-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facilitator_id: facilId })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              toast(`Laporan dikirim! Sukses: ${data.sent}, Gagal: ${data.failed}`, 'success');
            } else {
              throw new Error(data.error || 'Gagal mengirim email.');
            }
          } else {
            const errData = await res.json();
            throw new Error(errData.error || 'Terjadi kesalahan server.');
          }
        } catch (err: any) {
          console.error('Send progress email error:', err);
          toast(err.message || 'Gagal mengirim email progres.', 'error');
        } finally {
          setIsSendingEmail(false);
        }
      }
    });
  };

  const handleSendEmailSingle = async (participantId: string, participantName: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant || !participant.email || participant.email.trim() === '') {
      toast('Peserta tidak memiliki alamat email terdaftar.', 'error');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Kirim Email Peserta',
      message: `Apakah Anda yakin ingin mengirim laporan progres mingguan ke email ${participantName}?`,
      confirmText: 'Kirim Email',
      type: 'info',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setSendingEmailId(participantId);
        try {
          const res = await fetch('/api/admin/send-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facilitator_id: facilId, participant_id: participantId })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.sent > 0) {
              toast(`Laporan progres berhasil dikirim ke ${participantName}!`, 'success');
            } else {
              throw new Error(data.error || 'Gagal mengirim email.');
            }
          } else {
            const errData = await res.json();
            throw new Error(errData.error || 'Terjadi kesalahan server.');
          }
        } catch (err: any) {
          console.error('Send single progress email error:', err);
          toast(err.message || `Gagal mengirim email progres ke ${participantName}.`, 'error');
        } finally {
          setSendingEmailId(null);
        }
      }
    });
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
    setConfirmConfig({
      isOpen: true,
      title: 'Hapus Peserta',
      message: `Apakah Anda yakin ingin menghapus peserta "${name}" dari daftar bimbingan Anda? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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
      }
    });
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

  if (isMaintenance) {
    return (
      <div className="min-h-dvh flex flex-col justify-center items-center pb-12 px-4 font-mono bg-white text-black">
        <div className="max-w-md w-full animate-scale-in">
          <div className="neobrutal-card text-center p-6 md:p-8 space-y-6">
            <div className="w-14 h-14 rounded-lg overflow-hidden border-[3px] border-black mx-auto shadow-[3px_3px_0px_#000] flex items-center justify-center bg-yellow-300 text-2xl">
              🛠
            </div>
            <h2 className="text-2xl font-extrabold text-black uppercase">
              Pemeliharaan Sistem
            </h2>
            <p className="text-sm text-text-muted leading-relaxed font-bold">
              Aplikasi ini sedang dalam proses pemeliharaan berkala oleh Mentor Utama. Silakan kembali beberapa saat lagi. Terima kasih!
            </p>
          </div>
        </div>
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
          onSendEmailProgress={handleSendEmailProgress}
          isSendingEmail={isSendingEmail}
          showEmailProgress={facilProfileUrl === 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c'}
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
          showEmailProgress={facilProfileUrl === 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c'}
          onSendEmailSingle={handleSendEmailSingle}
          sendingEmailId={sendingEmailId}
        />

        {/* Riwayat Unggahan CSV & Rollback */}
        {(totalBimbingan > 0 || uploadHistory.length > 0) && (
          <div className="neobrutal-card space-y-4 animate-fade-slide-up">
            <span className="text-xs font-black uppercase text-black block border-b-[2px] border-black pb-2">
              Riwayat Unggahan CSV & Rollback
            </span>
            
            {loadingHistory ? (
              <div className="py-6 text-center text-xs text-text-muted">
                <UpdateIcon className="w-4 h-4 animate-spin mx-auto mb-1" />
                <span>MEMUAT RIWAYAT...</span>
              </div>
            ) : uploadHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted uppercase font-bold">
                Belum ada riwayat unggahan CSV.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-black text-text-muted uppercase font-bold text-[10px]">
                      <th className="py-2.5 px-2">NAMA FILE</th>
                      <th className="py-2.5 px-2 text-center w-36">TANGGAL UNGGAH</th>
                      <th className="py-2.5 px-2 text-center w-24">JUMLAH DATA</th>
                      <th className="py-2.5 px-2 text-center w-24">STATUS</th>
                      <th className="py-2.5 px-2 text-center w-24">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black text-black">
                    {uploadHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-surface-alt transition-colors">
                        <td className="py-2.5 px-2 font-bold truncate max-w-[200px]" title={h.filename}>{h.filename}</td>
                        <td className="py-2.5 px-2 text-center text-text-muted text-[10px]">
                          {new Date(h.uploaded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black">{h.records_count}</td>
                        <td className="py-2.5 px-2 text-center">
                          {h.status === 'completed' ? (
                            <span className="inline-block px-1.5 py-0.5 bg-[#DEF7EC] text-[#03543F] border-[1.5px] border-black rounded text-[8px] font-black uppercase">
                              Sukses
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 bg-[#FDE8E8] text-[#9B1C1C] border-[1.5px] border-black rounded text-[8px] font-black uppercase">
                              Rolled Back
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {h.status === 'completed' ? (
                            <button
                              onClick={() => handleRollbackUpload(h.id, h.filename)}
                              className="px-2 py-0.5 bg-secondary text-white border-[2px] border-black rounded text-[8px] font-black uppercase shadow-[1.5px_1.5px_0_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0_#000] transition-all hover:bg-secondary/90"
                            >
                              ROLLBACK
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      <ImportCSVModal
        isOpen={isModalOpen}
        isImporting={isImporting}
        modalStats={modalStats}
        isDuplicate={isDuplicateFile}
        uploadFilename={uploadFilename}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmImport}
      />

      {showSessionExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="neobrutal-card max-w-sm w-full text-center space-y-5 animate-scale-in">
            <div className="w-14 h-14 rounded-lg bg-secondary/10 border-[3px] border-secondary flex items-center justify-center mx-auto">
              <ExclamationTriangleIcon className="w-7 h-7 text-secondary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase text-black">Pembaruan Keamanan Penting</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Sistem telah diperbarui untuk keamanan yang lebih baik.
                Silakan login kembali untuk melanjutkan.
              </p>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/participants', { method: 'DELETE' }).catch(() => {});
                localStorage.removeItem('myProfileId');
                window.location.href = '/';
              }}
              className="neobrutal-btn-primary w-full"
            >
              Login Kembali
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        showCancel={confirmConfig.showCancel}
      />
    </div>
  );
}
