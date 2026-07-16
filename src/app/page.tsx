'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import ProfileHeader from '@/components/ProfileHeader';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import LeaderboardPanel from '@/components/FacilitatorPanel';
import { useToast } from '@/components/Toast';
import { Participant, Badge } from '@/lib/db';
import { UpdateIcon, ExclamationTriangleIcon, Cross2Icon } from '@radix-ui/react-icons';

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

  const fetchParticipantDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/participants/${id}`);
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
    if (confirm('Apakah Anda yakin ingin keluar sesi ini? Profil Anda tidak akan terhapus dari sistem, dan link Anda tetap tersimpan untuk memudahkan masuk kembali.')) {
      localStorage.removeItem('myProfileId'); // link (lastProfileUrl) sengaja dipertahankan
      setMyProfileId(null);
      setSelectedParticipantId(null);
      setSelectedParticipant(null);
      setBadges([]);
      setMyRole(null);
      setCurrentView('dashboard');
    }
  };

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
              />
            )}

            {/* Navbar: switcher */}
            <nav className="flex items-center gap-1 bg-surface-alt p-1 border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000]">
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  if (myProfileId) setSelectedParticipantId(myProfileId);
                }}
                className={`flex-1 px-5 py-2.5 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 border-[3px] ${
                  currentView === 'dashboard'
                    ? 'bg-primary text-black border-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                    : 'text-text-muted hover:text-black hover:bg-white border-transparent'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('leaderboard')}
                className={`flex-1 px-5 py-2.5 rounded-md text-xs uppercase font-bold tracking-wider transition-all duration-200 border-[3px] ${
                  currentView === 'leaderboard'
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
                onClick={() => setIsNotifOpen(false)}
                className="p-1 border-[2.5px] border-black rounded bg-white hover:bg-secondary hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-all"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3.5 font-mono text-[11px] sm:text-xs text-left overflow-y-auto pr-1 py-2 flex-grow my-3">
              <div className="!p-3 border-[2px] border-black bg-primary/10 rounded-lg shadow-[2px_2px_0px_#000] space-y-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-tertiary">Update Sistem</span>
                  <span className="text-[8px] sm:text-[9px] text-text-muted">15 Jul 2026</span>
                </div>
                <h4 className="font-extrabold text-black uppercase text-xs sm:text-sm">Perbaikan Bug Minor</h4>
                <p className="text-text-muted leading-normal sm:leading-relaxed">
                  Terima kasih banyak atas masukan dan laporan kendala yang Anda kirimkan. Kami memohon maaf atas ketidaknyamanan saat menggunakan platform ini sebelumnya.
                  <br /><br />
                  Kami telah menyelesaikan perbaikan pada sistem perhitungan poin, penyaringan quest, serta validasi URL profil untuk memastikan data tracker berjalan dengan akurat dan lancar.
                </p>
              </div>
            </div>

            <div className="pt-2 shrink-0 border-t-[3px] border-black mt-2">
              <button
                onClick={() => setIsNotifOpen(false)}
                className="neobrutal-btn-primary w-full text-center py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                Paham & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
