'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { ArrowLeftIcon, UpdateIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import ConfirmModal from '../components/ConfirmModal';
import { APP_VERSION } from '@/lib/version';

interface UnsyncedMember {
  id: string;
  name: string;
  profile_url: string;
  created_at: string;
  facilitator_name: string;
}

interface RecentMember {
  id: string;
  name: string;
  profile_url: string;
  games_count: number;
  skills_count: number;
  monthly_points: number;
  last_synced?: string | null;
  created_at: string;
  facilitator_name: string;
}

interface FacilitatorInfo {
  id: string;
  name: string;
  profile_url: string;
  member_count: number;
}

const AUTHORIZED_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';
const AUTHORIZED_URL = 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c';

export default function MentorMonitorPage() {
  const toast = useToast();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [myId, setMyId] = useState('');

  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState({ total: 0, unsynced: 0, recent24h: 0 });
  const [unsyncedList, setUnsyncedList] = useState<UnsyncedMember[]>([]);
  const [recentList, setRecentList] = useState<RecentMember[]>([]);
  const [allUnsyncedIds, setAllUnsyncedIds] = useState<string[]>([]);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [syncStatusText, setSyncStatusText] = useState('');

  const [activeTab, setActiveTab] = useState<'unsynced' | 'recent' | 'facilitators'>('unsynced');
  const [facilitators, setFacilitators] = useState<FacilitatorInfo[]>([]);
  const [loadingFacilitators, setLoadingFacilitators] = useState(false);

  const [systemLock, setSystemLock] = useState<{ locked: boolean; by?: string }>({ locked: false });
  const [showSessionExpired, setShowSessionExpired] = useState(false);

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
      if (myId) {
        fetchMonitorData(myId);
      }
    }
    setPrevLocked(!!systemLock.locked);
  }, [systemLock.locked, prevLocked, myId]);

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
        if (data.participant && data.participant.id === AUTHORIZED_ID && data.participant.profile_url === AUTHORIZED_URL) {
          setIsAuthorized(true);
          setMyId(savedId);
          fetchMonitorData(savedId);
        }
      }
    } catch (err) {
      console.error('Admin auth error:', err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const fetchMonitorData = async (profileId: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/admin/monitor?profile_id=${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUnsyncedList(data.unsyncedList);
        setRecentList(data.recentList);
        setAllUnsyncedIds(data.allUnsyncedIds || []);
      }
    } catch (err) {
      console.error('Error fetching monitor stats:', err);
      toast('Gagal mengambil data monitoring.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchFacilitators = async () => {
    setLoadingFacilitators(true);
    try {
      const res = await fetch(`/api/participants`);
      if (res.ok) {
        const data = await res.json();
        const fasils = (data.participants || []).filter((p: any) => p.role === 'facilitator');
        // Get member counts
        const countsRes = await fetch(`/api/admin/monitor?profile_id=${myId}`);
        const facilList: FacilitatorInfo[] = fasils.map((f: any) => ({
          id: f.id,
          name: f.name,
          profile_url: f.profile_url,
          member_count: 0
        }));
        setFacilitators(facilList.sort((a: FacilitatorInfo, b: FacilitatorInfo) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error('Error fetching facilitators:', err);
      toast('Gagal mengambil daftar fasilitator.', 'error');
    } finally {
      setLoadingFacilitators(false);
    }
  };

  const handleSyncParticipant = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/facilitator-members/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Gagal sync');
      toast('Peserta berhasil disinkronkan.', 'success');
      fetchMonitorData(myId);
    } catch (err) {
      toast('Gagal menyinkronkan data.', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllUnsynced = async () => {
    if (allUnsyncedIds.length === 0 || isSyncingAll) return;

    // Acquire lock (always allows force override since holder is 'Mentor Utama')
    try {
      const lockRes = await fetch('/api/sync-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acquire', holder: 'Mentor Utama' })
      });
      if (lockRes.ok) {
        const lockData = await lockRes.json();
        if (!lockData.success) {
          toast(`Gagal mengamankan sinkronisasi.`, 'error');
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
    setSyncStatusText(`Memulai...`);

    let successCount = 0;
    let failCount = 0;
    const failedIds: string[] = [];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const syncBatch = async (ids: string[], isRetry: boolean) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const currentCount = i + 1;
        const totalCount = ids.length;

        if (isRetry) {
          setSyncStatusText(`RETRYING (${currentCount}/${totalCount}) ✅ | ${failCount} gagal`);
        } else {
          setSyncStatusText(`SYNCING (${currentCount}/${totalCount}) ✅ | ${failCount} gagal`);
        }

        // Heartbeat lock check every 5 items
        if (i % 5 === 0) {
          try {
            const hbRes = await fetch('/api/sync-lock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'heartbeat', holder: 'Mentor Utama' })
            });
            if (hbRes.ok) {
              const hbData = await hbRes.json();
              if (!hbData.success) break;
            } else {
              break;
            }
          } catch (hbErr) {
            break;
          }
        }

        try {
          const res = await fetch(`/api/facilitator-members/${id}`, { method: 'POST' });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            if (!isRetry) failedIds.push(id);
          }
        } catch (err) {
          failCount++;
          if (!isRetry) failedIds.push(id);
        }

        // Jeda 500ms agar Google tidak memblokir IP
        await delay(500);
      }
    };

    try {
      // Putaran 1
      await syncBatch(allUnsyncedIds, false);

      // Putaran 2: Auto-retry jika ada yang gagal
      if (failedIds.length > 0) {
        setSyncStatusText(`Mencoba ulang ${failedIds.length} data gagal...`);
        await delay(1000);
        const firstPassFailedCount = failCount;
        failCount = 0;
        await syncBatch(failedIds, true);
        failCount = firstPassFailedCount - (successCount - (allUnsyncedIds.length - firstPassFailedCount));
      }
    } finally {
      setIsSyncingAll(false);
      setSyncStatusText('');
      // Release lock
      try {
        await fetch('/api/sync-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', holder: 'Mentor Utama' })
        });
      } catch (releaseErr) {
        console.error('Error releasing lock:', releaseErr);
      }
      
      checkSyncLock();
      toast(`Sync semua selesai! Sukses: ${successCount}, Gagal: ${failCount}`, 'info');
      fetchMonitorData(myId);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center font-mono text-xs">
        <UpdateIcon className="w-5 h-5 animate-spin mr-2" />
        <span>MEMVALIDASI OTORISASI MENTOR...</span>
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
              Halaman monitoring ini bersifat rahasia dan hanya dapat diakses secara khusus oleh pemilik proyek (Mentor Utama).
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

  return (
    <div className="min-h-dvh flex flex-col pb-12 font-mono">
      <div className="max-w-4xl w-full mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Header */}
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
              <h1 className="text-lg font-black uppercase text-black">Monitor Database</h1>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                Sesi: Mentor Utama (Fajrin Widianto)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (systemLock.locked && systemLock.by === 'Mentor Utama') {
                  try {
                    const res = await fetch('/api/sync-lock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'release', holder: 'Mentor Utama' })
                    });
                    if (res.ok) {
                      toast('Sync sudah dibuka. Fasilitator bisa sync lagi.', 'success');
                      fetchMonitorData(myId);
                      checkSyncLock();
                    }
                  } catch { toast('Gagal membuka lock.', 'error'); }
                } else {
                  try {
                    const res = await fetch('/api/sync-lock', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'acquire', holder: 'Mentor Utama' })
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast('Sync terkunci. Fasilitator tidak bisa sync sampai kamu buka.', 'info');
                      checkSyncLock();
                    } else {
                      toast('Gagal mengunci sync.', 'error');
                    }
                  } catch { toast('Gagal mengunci sync.', 'error'); }
                }
              }}
              disabled={isSyncingAll}
              className={`p-2 border-[2.5px] border-black rounded hover:bg-surface-alt active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] shadow-[3px_3px_0px_#000] transition-all disabled:opacity-50 ${
                systemLock.locked && systemLock.by === 'Mentor Utama'
                  ? 'bg-secondary text-white'
                  : 'bg-white text-black'
              }`}
              title={systemLock.locked && systemLock.by === 'Mentor Utama' ? 'Buka Lock Sync' : 'Kunci Sync Global'}
            >
              {systemLock.locked && systemLock.by === 'Mentor Utama' ? '🔓' : '🔒'}
            </button>
            <button
              onClick={() => fetchMonitorData(myId)}
              disabled={loadingData || isSyncingAll}
              className="p-2 border-[2.5px] border-black rounded bg-white hover:bg-surface-alt active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#000] shadow-[3px_3px_0px_#000] transition-all"
              title="Refresh Data"
            >
              <UpdateIcon className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-slide-up">
          <div className="neobrutal-card p-4 flex flex-col justify-between bg-[#E1EFFE] text-blue-900">
            <span className="text-[10px] uppercase font-bold text-blue-800">Total Fasil Members</span>
            <span className="text-3xl font-black mt-2">{stats.total}</span>
          </div>

          <div className="neobrutal-card p-4 flex flex-col justify-between bg-[#FEF08A] text-yellow-900">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-yellow-800">Belum Sinkron</span>
                <span className="text-3xl font-black mt-2 block">{stats.unsynced}</span>
              </div>
              {stats.unsynced > 0 && (
                <button
                  onClick={handleSyncAllUnsynced}
                  disabled={isSyncingAll || loadingData}
                  className="neobrutal-btn-secondary !bg-secondary hover:!bg-secondary-dark !text-white flex items-center gap-1.5 !py-1.5 !px-2.5 text-[9px] font-extrabold shadow-[2px_2px_0px_#000] border-[2px] border-black rounded transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] disabled:opacity-50"
                >
                  <UpdateIcon className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  {isSyncingAll ? syncStatusText : 'SYNC SEMUA'}
                </button>
              )}
            </div>
          </div>

          <div className="neobrutal-card p-4 flex flex-col justify-between bg-[#DEF7EC] text-green-900">
            <span className="text-[10px] uppercase font-bold text-green-800">Peserta Baru (24 Jam)</span>
            <span className="text-3xl font-black mt-2">{stats.recent24h}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b-[3px] border-black pb-0.5 animate-fade-slide-up">
          <button
            onClick={() => setActiveTab('unsynced')}
            className={`px-4 py-2 border-[3px] border-b-0 border-black rounded-t-lg text-xs font-black uppercase transition-all shadow-[2px_-2px_0_#000] ${
              activeTab === 'unsynced' ? 'bg-primary text-black -translate-y-0.5' : 'bg-surface-alt text-text-muted hover:text-black'
            }`}
          >
            Belum Sync ({unsyncedList.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 border-[3px] border-b-0 border-black rounded-t-lg text-xs font-black uppercase transition-all shadow-[2px_-2px_0_#000] ${
              activeTab === 'recent' ? 'bg-primary text-black -translate-y-0.5' : 'bg-surface-alt text-text-muted hover:text-black'
            }`}
          >
            Upload Terbaru (50)
          </button>
          <button
            onClick={() => { setActiveTab('facilitators'); if (facilitators.length === 0) fetchFacilitators(); }}
            className={`px-4 py-2 border-[3px] border-b-0 border-black rounded-t-lg text-xs font-black uppercase transition-all shadow-[2px_-2px_0_#000] ${
              activeTab === 'facilitators' ? 'bg-primary text-black -translate-y-0.5' : 'bg-surface-alt text-text-muted hover:text-black'
            }`}
          >
            Fasilitator
          </button>
        </div>

        {/* Unsynced List */}
        {activeTab === 'unsynced' && (
          <div className="neobrutal-card space-y-4 animate-fade-slide-up">
            {loadingData ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <UpdateIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span>MEMUAT DATA MONITOR...</span>
              </div>
            ) : unsyncedList.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600 border-[2.5px] border-black shadow-[2.5px_2.5px_0_#000]">
                  ✓
                </div>
                <p className="text-xs font-bold text-black uppercase">Semua peserta sudah sinkron!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-black text-text-muted uppercase font-bold text-[10px]">
                      <th className="py-2 px-2 text-center w-10">#</th>
                      <th className="py-2 px-2">NAMA</th>
                      <th className="py-2 px-2">FASILITATOR</th>
                      <th className="py-2 px-2 hidden sm:table-cell">URL PROFIL</th>
                      <th className="py-2 px-2 text-center w-28">TANGGAL MASUK</th>
                      <th className="py-2 px-2 text-center w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black text-black">
                    {unsyncedList.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-surface-alt">
                        <td className="py-2.5 px-2 text-center font-bold text-text-muted">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-extrabold">{p.name}</td>
                        <td className="py-2.5 px-2 font-bold text-tertiary">{p.facilitator_name}</td>
                        <td className="py-2.5 px-2 hidden sm:table-cell text-text-muted truncate max-w-[180px]">
                          <a href={p.profile_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {p.profile_url}
                          </a>
                        </td>
                        <td className="py-2.5 px-2 text-center text-text-muted text-[10px]">
                          {new Date(p.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleSyncParticipant(p.id)}
                            disabled={syncingId !== null}
                            className="p-1 border-[2.5px] border-black rounded bg-white hover:bg-tertiary hover:text-white shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50"
                            title="Sync Sekarang"
                          >
                            {syncingId === p.id ? (
                              <UpdateIcon className="w-3 h-3 animate-spin" />
                            ) : (
                              <UpdateIcon className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Recent Uploads List */}
        {activeTab === 'recent' && (
          <div className="neobrutal-card space-y-4 animate-fade-slide-up">
            {loadingData ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <UpdateIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span>MEMUAT DATA MONITOR...</span>
              </div>
            ) : recentList.length === 0 ? (
              <div className="py-16 text-center text-xs text-text-muted">
                BELUM ADA DATA PESERTA DI DATABASE
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-black text-text-muted uppercase font-bold text-[10px]">
                      <th className="py-2 px-2 text-center w-10">#</th>
                      <th className="py-2 px-2">NAMA</th>
                      <th className="py-2 px-2">FASILITATOR</th>
                      <th className="py-2 px-2 text-center w-20">POINTS</th>
                      <th className="py-2 px-2 text-center hidden sm:table-cell w-36">SYNC TERAKHIR</th>
                      <th className="py-2 px-2 text-center w-28">TANGGAL MASUK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black text-black">
                    {recentList.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-surface-alt">
                        <td className="py-2.5 px-2 text-center font-bold text-text-muted">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-extrabold">{p.name}</td>
                        <td className="py-2.5 px-2 font-bold text-tertiary">{p.facilitator_name}</td>
                        <td className="py-2.5 px-2 text-center font-black">
                          {p.monthly_points.toFixed(1)}
                          <div className="text-[8px] text-text-muted font-bold">{p.games_count} G / {p.skills_count} S</div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-text-muted text-[10px] hidden sm:table-cell">
                          {p.last_synced
                            ? new Date(p.last_synced).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Belum Sinkron'
                          }
                        </td>
                        <td className="py-2.5 px-2 text-center text-text-muted text-[10px]">
                          {new Date(p.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Facilitator List */}
        {activeTab === 'facilitators' && (
          <div className="neobrutal-card space-y-4 animate-fade-slide-up">
            {loadingFacilitators ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <UpdateIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                <span>MEMUAT DAFTAR FASILITATOR...</span>
              </div>
            ) : facilitators.length === 0 ? (
              <div className="py-16 text-center text-xs text-text-muted">
                BELUM ADA DATA FASILITATOR
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-[3px] border-black text-text-muted uppercase font-bold text-[10px]">
                      <th className="py-2 px-2 text-center w-10">#</th>
                      <th className="py-2 px-2">NAMA</th>
                      <th className="py-2 px-2 text-center w-28">SKILLS BOOST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black text-black">
                    {facilitators.map((f, idx) => (
                      <tr key={f.id} className="hover:bg-surface-alt">
                        <td className="py-2.5 px-2 text-center font-bold text-text-muted">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-extrabold">{f.name}</td>
                        <td className="py-2.5 px-2 text-center">
                          <a
                            href={f.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-[#E1EFFE] text-[#1E429F] border-[2px] border-black rounded text-[10px] font-bold uppercase shadow-[1.5px_1.5px_0_#000] hover:bg-[#1E429F] hover:text-white transition-colors"
                          >
                            Profil ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pt-3 border-t-[2px] border-black text-[10px] text-text-muted font-bold uppercase text-center">
                  Total: {facilitators.length} Fasilitator
                </div>
              </div>
            )}
          </div>
        )}

      </div>

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
    </div>
  );
}
