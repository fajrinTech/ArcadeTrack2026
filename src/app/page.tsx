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

interface NotificationItem {
  id: string;
  dateStr: string;
  category: string;
  title: string;
  content: string;
  role?: 'facilitator' | 'participant';
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: '2026-08-02-server-update',
    dateStr: '2 Ags 2026',
    category: 'Pembaruan Sistem',
    title: 'Pembaruan Sistem & Permohonan Maaf Kendala Akses',
    content: 'Halo Rekan-rekan Peserta & Fasilitator Arcade 2026!<br /><br />Kami memohon maaf yang sebesar-besarnya atas kendala akses atau server yang sempat lambat/down sebelumnya.<br /><br /><strong>Apa saja yang sudah kami perbaiki?</strong><br />1. <strong>Pindah ke Server Baru</strong>: Sistem sudah kami pindahkan ke server baru yang lebih kuat dan stabil agar tidak gampang eror lagi.<br />2. <strong>Akses Lebih Cepat & Hemat Kuota</strong>: Membuka Dashboard dan melihat Leaderboard kini jauh lebih ringan dan ngebut.<br /><br />Tenang saja, seluruh data poin, badge, dan progres belajar Anda <strong>dijamin aman 100%</strong>.<br /><br />Terima kasih banyak atas kesabaran dan pengertian rekan-rekan semua. Selamat melanjutkan perburuan badge di Google Arcade 2026! 🚀'
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
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!localStorage.getItem('notice_v203')) {
      setIsNoticeOpen(true);
    }
  }, []);

  const handleCloseNotice = () => {
    setIsNoticeOpen(false);
    localStorage.setItem('notice_v203', '1');
  };

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
    onConfirm: () => { }
  });

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    checkSyncLock();
    let interval = setInterval(checkSyncLock, 60000);
    const onVisibility = () => {
      clearInterval(interval);
      if (!document.hidden) {
        checkSyncLock();
        interval = setInterval(checkSyncLock, 60000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

      const syncData = await res.json();
      if (syncData.participant) {
        setSelectedParticipant(syncData.participant);
        if (syncData.badges) {
          setBadges(syncData.badges);
        }
      }

      await fetchParticipants();
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
        fetch('/api/participants', { method: 'DELETE' }).catch(() => { });
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
                isDarkMode={isDarkMode}
                onToggleTheme={toggleTheme}
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


      {/* Global Notice Modal — Single Notice (Tanpa Slide) */}
      {isNoticeOpen && !confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in pointer-events-auto">
          <div className="w-[92vw] max-w-md flex flex-col border-[3px] border-black shadow-[6px_6px_0px_#000] rounded-xl bg-surface text-foreground overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between border-b-[2px] border-black px-3 sm:px-4 py-2 shrink-0 bg-surface-alt">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-secondary font-mono">
                PESAN DARI MIMIN 📨
              </span>
              <button
                onClick={handleCloseNotice}
                className="p-1 border-[1.5px] border-black rounded bg-surface hover:bg-secondary hover:text-white transition-colors text-foreground shrink-0"
              >
                <Cross2Icon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className="w-full h-52 sm:h-64 bg-black flex items-center justify-center shrink-0 overflow-hidden cursor-zoom-in border-b-[2px] border-black"
              onClick={() => setLightboxSrc('https://i.pinimg.com/1200x/5c/d5/9f/5cd59f8a19b10da181938ce2945d2a52.jpg')}
              title="Klik untuk lihat gambar penuh"
            >
              <img
                src="https://i.pinimg.com/1200x/5c/d5/9f/5cd59f8a19b10da181938ce2945d2a52.jpg"
                alt="Pesan Mimin"
                className="w-full h-full object-contain bg-black pointer-events-none"
              />
            </div>

            <div className="p-3.5 sm:p-4 font-mono text-left space-y-2 bg-surface text-xs leading-relaxed text-foreground">
              <p className="font-bold text-secondary text-sm">Arcade Game sudah tersedia, selamat mengerjakan (mecut 😂)</p>
            </div>

            <div className="px-3 sm:px-4 pb-3.5 pt-1 shrink-0 flex justify-end">
              <button
                onClick={handleCloseNotice}
                className="neobrutal-btn-primary text-xs !py-2 !px-4 font-black uppercase !text-black w-full"
              >
                Lopyu Min Muach 😂
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 animate-fade-in cursor-zoom-out p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-none"
          />
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
