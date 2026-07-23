'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import ProfileHeader from '@/components/ProfileHeader';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import LeaderboardPanel from '@/components/FacilitatorPanel';
import { useToast } from '@/components/Toast';
import { Participant, Badge } from '@/lib/db';
import { UpdateIcon, ExclamationTriangleIcon, Cross2Icon } from '@radix-ui/react-icons';
import ConfirmModal from './panel/components/ConfirmModal';
import { APP_VERSION } from '@/lib/version';

const NOTIFICATIONS = [
  {
    id: '2026-07-23-fasttrack',
    dateStr: '23 Jul 2026',
    category: 'Katalog FastTrack',
    title: 'Pembaruan 100 Foundational Skill Badges & Fitur Sort',
    content: 'Halo Rekan-rekan Peserta Arcade 2026!<br /><br />Katalog FastTrack Foundational Skill Badges telah diperbarui penuh dengan <strong>100 Skill Badges resmi</strong>!<br /><br /><strong>Apa saja yang baru?</strong><br />1. <strong>100 Skill Badges Terlengkap</strong>: Seluruh daftar badge FastTrack kini tersedia lengkap dengan link dan jumlah lab.<br />2. <strong>Fitur Pengurutan (Sort By)</strong>: Anda dapat mengurutkan badge berdasarkan jumlah lab terkecil/terbanyak, atau durasi tersingkat/terpanjang untuk menyelesaikan badge secara efisien.<br />3. <strong>Tampilan Mobile Jelas</strong>: Tag label, jumlah lab, dan durasi kini tampil tajam dan mudah dibaca di smartphone.<br /><br />Setiap Foundational Skill Badge bernilai <strong>0.5 poin</strong>. Silakan cek tab <strong>Fasttrack</strong> di dashboard untuk mulai mengerjakan!'
  },
  {
    id: '2026-07-21-security',
    dateStr: '21 Jul 2026',
    category: 'Pembaruan Keamanan',
    title: 'Patch Keamanan v1.4.5 — Login Ulang Diperlukan',
    content: 'Sistem telah diperbarui ke v1.4.5 dengan peningkatan keamanan session. Seluruh fasilitator diminta login ulang dari halaman utama untuk mengaktifkan session cookie baru yang lebih aman.<br /><br />Jika Anda melihat pesan ini setelah diminta login ulang, berarti session Anda telah berhasil diperbarui. Terima kasih atas pengertiannya.',
    role: 'facilitator'
  },
  {
    id: '2026-07-18-bugfix',
    dateStr: '18 Jul 2026',
    category: 'Perbaikan Sistem',
    title: 'Perbaikan Bug Sinkronisasi Poin & Badge Peserta',
    content: 'Halo Fasilitator! Kami telah mengidentifikasi dan memperbaiki bug terkait ketidaksesuaian jumlah Game/Skill Badge pada tabel progres peserta bimbingan.<br /><br />Sebelumnya, sistem sinkronisasi panel menghitung seluruh badge secara historis (termasuk dari tahun 2025). Masalah ini telah diperbaiki sehingga sekarang Panel Fasilitator menyaring data secara akurat sesuai periode aktif berjalan (13 Juli 2026). Seluruh data yang sempat mengalami ketidaksesuaian kini telah otomatis dikoreksi di database.<br /><br />Kami memohon maaf atas ketidaknyamanan yang ditimbulkan.',
    role: 'facilitator'
  },
  {
    id: '2026-07-18',
    dateStr: '18 Jul 2026',
    category: 'Fitur Fasil',
    title: 'Rilis Panel Fasilitator & Sinkronisasi',
    content: 'Halo Fasilitator! Kami telah merilis fitur Panel Fasilitator baru untuk memudahkan Anda mengelola peserta bimbingan.<br /><br />Di panel ini, Anda dapat:<br />1. Mengunggah file CSV dari Arcade Global untuk mengimpor daftar peserta bimbingan Anda secara massal.<br />2. Melihat progres milestone fasilitator secara real-time.<br />3. Menyinkronkan seluruh profil peserta bimbingan sekaligus dengan tombol "Sync Semua".<br />4. Menghapus atau menyinkronkan data peserta bimbingan secara individu.<br /><br />Untuk mengakses panel ini, pastikan Anda masuk menggunakan profil Google Skills Boost yang terdaftar sebagai fasilitator, kemudian klik tombol "Panel Fasil" di pojok kanan atas dashboard.',
    role: 'facilitator'
  },
  {
    id: '2026-07-17',
    dateStr: '17 Jul 2026',
    category: 'Fitur Baru',
    title: 'Add New Feature & Perbaiki Bug',
    content: 'Kami sangat menghargai masukan dan laporan kendala Anda demi menyempurnakan platform ini. Sekarang Anda bisa mengirimkan ide fitur baru atau laporan bug melalui formulir resmi kami.<br /><br />Silakan klik tautan berikut untuk mengisi formulir: <a href="https://zeff.my.id/feedback-tracker" target="_blank" rel="noopener noreferrer" class="text-tertiary hover:underline font-bold">Formulir Masukan & Bug Tracker</a>.'
  },
  {
    id: '2026-07-16',
    dateStr: '16 Jul 2026',
    category: 'Fitur Baru',
    title: 'Pencarian Peserta',
    content: 'Sekarang Anda bisa mencari nama peserta secara langsung di Leaderboard. Ketik saja nama di kolom pencarian untuk mem-filter data secara real-time.<br /><br />Untuk menjaga visual tetap rapi, podium 3 besar akan otomatis disembunyikan selama Anda sedang melakukan pencarian.'
  },
  {
    id: '2026-07-15',
    dateStr: '15 Jul 2026',
    category: 'Update Sistem',
    title: 'Perbaikan Bug Minor',
    content: 'Terima kasih banyak atas masukan dan laporan kendala yang Anda kirimkan. Kami memohon maaf atas ketidaknyamanan saat menggunakan platform ini sebelumnya.<br /><br />Kami telah menyelesaikan perbaikan pada sistem perhitungan poin, penyaringan quest, serta validasi URL profil untuk memastikan data tracker berjalan dengan akurat dan lancar.'
  }
];

export default function Home() {
  const toast = useToast();
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [myRole, setMyRole] = useState<'facilitator' | 'participant' | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'leaderboard'>('dashboard');

  const [profileUrl, setProfileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [openNotifs, setOpenNotifs] = useState<Record<string, boolean>>({});
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

  useEffect(() => {
    if (isNotifOpen) {
      const lastRead = localStorage.getItem('arcade_notif_last_read') || '1970-01-01';
      const initialOpen: Record<string, boolean> = {};
      NOTIFICATIONS.forEach(notif => {
        initialOpen[notif.id] = notif.id > lastRead;
      });
      setOpenNotifs(initialOpen);
    }
  }, [isNotifOpen]);

  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const checkSyncLock = async () => {
    try {
      const res = await fetch('/api/sync-lock');
      if (res.ok) {
        const data = await res.json();
        setIsMaintenance(!!data.maintenance);

        // Auto-update notification modal for global version upgrade
        if (data.version && data.version !== APP_VERSION) {
          setConfirmConfig({
            isOpen: true,
            title: `Pembaruan Sistem Tersedia (v${data.version})`,
            message: `Versi terbaru sistem (v${data.version}) telah dirilis untuk pembaruan Katalog FastTrack 100 Skill Badges, optimasi performa, dan stabilitas data. Silakan klik tombol di bawah untuk memuat ulang halaman.`,
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

  useEffect(() => {
    checkSyncLock();
    const interval = setInterval(checkSyncLock, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('myProfileId');
    if (savedId) {
      setMyProfileId(savedId);
      setSelectedParticipantId(savedId);
    }
    // Pre-fill link terakhir (cache) supaya login ulang lebih mudah.
    setProfileUrl(localStorage.getItem('lastProfileUrl') ?? '');
    fetchParticipants();
  }, []);

  useEffect(() => {
    if (myProfileId && myRole !== null) {
      const visibleNotifs = NOTIFICATIONS.filter(notif => !notif.role || notif.role === myRole);
      const latestNotifId = visibleNotifs[0]?.id;
      if (latestNotifId) {
        const lastRead = localStorage.getItem('arcade_notif_last_read');
        if (lastRead !== latestNotifId) {
          setIsNotifOpen(true);
        }
      }
    }
  }, [myProfileId, myRole]);

  const handleCloseNotif = () => {
    setIsNotifOpen(false);
    const visibleNotifs = NOTIFICATIONS.filter(notif => !notif.role || notif.role === myRole);
    const latestNotifId = visibleNotifs[0]?.id;
    if (latestNotifId) {
      localStorage.setItem('arcade_notif_last_read', latestNotifId);
    }
  };

  const fetchParticipantDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/participants/${id}`);
      if (res.status === 401) {
        // Session expired/invalid
        localStorage.removeItem('myProfileId');
        setMyProfileId(null);
        setSelectedParticipantId(null);
        setSelectedParticipant(null);
        setBadges([]);
        setMyRole(null);
        setCurrentView('dashboard');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSelectedParticipant(data.participant);
        setBadges(data.badges);

        const currentMyProfileId = myProfileId || localStorage.getItem('myProfileId');
        if (id === currentMyProfileId) {
          setMyRole(data.participant.role);
        }
      }
    } catch (err) {
      console.error('Error fetching participant detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (selectedParticipantId) {
      fetchParticipantDetail(selectedParticipantId);
    }
  }, [selectedParticipantId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl) return;

    setLoginError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_url: profileUrl })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal masuk. Pastikan URL profil Google Cloud Skills Boost Anda valid dan disetel ke Publik.');
      }

      const newPart = await res.json();

      localStorage.setItem('myProfileId', newPart.id);
      localStorage.setItem('lastProfileUrl', profileUrl); // cache link
      setMyProfileId(newPart.id);
      setSelectedParticipantId(newPart.id);
      setMyRole(newPart.role);
      setCurrentView('dashboard');

      await fetchParticipants();
      const nm = newPart.name || 'Learner';
      toast(newPart.returning ? `Selamat datang kembali, ${nm}!` : `Selamat datang, ${nm}!`, 'success');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Koneksi bermasalah. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncParticipant = async (id: string) => {
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'POST'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyinkronkan data.');
      }

      await fetchParticipants();
      if (selectedParticipantId === id) {
        await fetchParticipantDetail(id);
      }
      toast('Profil berhasil disinkronkan.', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Gagal menyinkronkan data.', 'error');
    }
  };

  const handleResetSession = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Keluar Sesi',
      message: 'Apakah Anda yakin ingin keluar sesi ini? Profil Anda tidak akan terhapus dari sistem, dan tautan Anda tetap tersimpan untuk memudahkan masuk kembali.',
      confirmText: 'Keluar Sesi',
      type: 'warning',
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        // Hapus session cookie di server
        fetch('/api/participants', { method: 'DELETE' }).catch(() => {});
        localStorage.removeItem('myProfileId'); // link (lastProfileUrl) sengaja dipertahankan
        setMyProfileId(null);
        setSelectedParticipantId(null);
        setSelectedParticipant(null);
        setBadges([]);
        setMyRole(null);
        setCurrentView('dashboard');
      }
    });
  };

  if (isMaintenance && myProfileId !== 'a3961d06-d854-4348-9977-004d5a3dd8d8') {
    return (
      <div className="min-h-dvh flex flex-col justify-center items-center pb-12 px-4 font-mono bg-white text-black">
        <div className="max-w-md w-full animate-scale-in">
          <div className="neobrutal-card text-center p-6 md:p-8 space-y-6 border-[3px] border-black shadow-[4px_4px_0_#000]">
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

  return (
    <div className="min-h-dvh flex flex-col pb-12">
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-6 py-6 relative z-10">

        {isLoadingList ? (
          <DashboardSkeleton />
        ) : !myProfileId ? (
          <div className="max-w-md w-full mx-auto mt-8 md:mt-16 px-4 animate-scale-in">
            <div className="neobrutal-card text-center p-6 md:p-8 space-y-6">

              <div className="space-y-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden border-[3px] border-black mx-auto shadow-[3px_3px_0px_#000]">
                  <img src="/500px.png" alt="Arcade Logo" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-2xl font-extrabold text-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
                  Arcade Login
                </h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest font-bold">
                  Google Cloud Skills Boost
                </p>
              </div>

              <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
                Cukup masukkan URL profil Google Cloud Skills Boost Anda yang sudah disetel ke <strong>Publik</strong>. Nama diambil otomatis dari profil.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left font-mono text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted block mb-1.5">URL Profil Skills Boost</label>
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="https://www.skills.google/public_profiles/..."
                    disabled={isSubmitting}
                    className="neobrutal-input"
                    required
                  />
                </div>

                {loginError && (
                  <div className="text-xs text-white bg-secondary border-[3px] border-black p-3.5 flex items-start gap-2.5 font-bold rounded-lg shadow-[3px_3px_0_#000]">
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !profileUrl}
                  className="neobrutal-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <UpdateIcon className="w-4 h-4 animate-spin" />
                      <span>CONNECTING PROFILE...</span>
                    </>
                  ) : (
                    <span>ENTER THE ARCADE</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">

            {/* Profile Header (Moved to the very top when logged in) */}
            {selectedParticipant && !isLoadingDetail && (
              <ProfileHeader
                participant={selectedParticipant}
                badges={badges}
                onResetSession={handleResetSession}
                onSync={myProfileId === selectedParticipant.id || myRole === 'facilitator' ? () => handleSyncParticipant(selectedParticipant.id) : undefined}
                onOpenNotifications={() => setIsNotifOpen(true)}
                latestNotifId={NOTIFICATIONS[0]?.id}
              />
            )}

            {/* Navbar: switcher */}
            <nav className="flex items-center gap-1 bg-surface-alt p-1 border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000]">
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  if (myProfileId) setSelectedParticipantId(myProfileId);
                }}
                className={`flex-1 px-5 py-2.5 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 border-[3px] ${currentView === 'dashboard'
                    ? 'bg-primary text-black border-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                    : 'text-text-muted hover:text-black hover:bg-white border-transparent'
                  }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className={`flex-1 px-5 py-2.5 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 border-[3px] ${currentView === 'leaderboard'
                    ? 'bg-tertiary text-white border-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                    : 'text-text-muted hover:text-black hover:bg-white border-transparent'
                  }`}
              >
                Leaderboard
              </button>
            </nav>

            {currentView === 'leaderboard' && (
              <div className="max-w-4xl mx-auto transition-all">
                <LeaderboardPanel
                  participants={participants}
                  selectedId={selectedParticipantId}
                  myProfileId={myProfileId}
                  isFacilitator={myRole === 'facilitator'}
                  onSelect={(id) => {
                    setSelectedParticipantId(id);
                    setCurrentView('dashboard');
                  }}
                />
              </div>
            )}

            {currentView === 'dashboard' && (
              <div className="w-full transition-all">
                {isLoadingDetail || !selectedParticipant ? (
                  <DashboardSkeleton />
                ) : (
                  <Dashboard
                    participant={selectedParticipant}
                    badges={badges}
                  />
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {isNotifOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
          <div className="neobrutal-card max-w-sm sm:max-w-md w-full !p-4 sm:!p-6 flex flex-col animate-scale-in bg-white max-h-[80vh]">
            <div className="flex items-center justify-between border-b-[3px] border-black pb-2 sm:pb-3 shrink-0">
              <h3 className="text-base sm:text-lg font-black text-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
                Notifikasi Program
              </h3>
              <button
                onClick={handleCloseNotif}
                className="p-1 border-[2.5px] border-black rounded bg-white hover:bg-secondary hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-[11px] sm:text-xs text-left overflow-y-auto pr-1 py-2 flex-grow my-3">
              {NOTIFICATIONS.filter(notif => !notif.role || notif.role === myRole).map((notif) => {
                const isOpen = !!openNotifs[notif.id];
                return (
                  <div
                    key={notif.id}
                    className="border-[2px] border-black bg-primary/10 rounded-lg shadow-[2px_2px_0px_#000] overflow-hidden flex flex-col"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => setOpenNotifs(prev => ({ ...prev, [notif.id]: !prev[notif.id] }))}
                      className="w-full text-left !p-3 flex flex-col gap-1 hover:bg-black/5 active:bg-black/10 transition-colors focus:outline-none shrink-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-tertiary">
                          {notif.category}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-text-muted font-bold">
                          {notif.dateStr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-black uppercase text-xs sm:text-sm truncate">
                          {notif.title}
                        </h4>
                        <span className="text-xs font-black shrink-0 text-black">
                          {isOpen ? '[-]' : '[+]'}
                        </span>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isOpen && (
                      <div
                        className="border-t-[2px] border-black p-3 bg-white text-text-muted leading-normal sm:leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: notif.content }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 shrink-0 border-t-[3px] border-black mt-2">
              <button
                onClick={handleCloseNotif}
                className="neobrutal-btn-primary w-full text-center py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                Paham & Tutup
              </button>
            </div>
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
