'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import LeaderboardPanel from '@/components/FacilitatorPanel';
import { useToast } from '@/components/Toast';
import { Participant, Badge } from '@/lib/db';
import { UpdateIcon, TargetIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

export default function Home() {
  const toast = useToast();
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'leaderboard'>('dashboard');

  const [name, setName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

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
    if (!name || !profileUrl) return;

    setLoginError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, profile_url: profileUrl })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal mendaftarkan profil. Pastikan URL profil Google Cloud Skills Boost Anda valid dan disetel ke Publik.');
      }

      const newPart = await res.json();
      
      localStorage.setItem('myProfileId', newPart.id);
      setMyProfileId(newPart.id);
      setSelectedParticipantId(newPart.id);
      setCurrentView('dashboard');
      
      await fetchParticipants();
      toast(`Selamat datang, ${newPart.name || 'Learner'}!`, 'success');
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
    if (confirm('Apakah Anda yakin ingin keluar sesi ini? Profil Anda tidak akan terhapus dari sistem, namun Anda harus memasukkan info kembali untuk melacak.')) {
      localStorage.removeItem('myProfileId');
      setMyProfileId(null);
      setSelectedParticipantId(null);
      setSelectedParticipant(null);
      setBadges([]);
      setName('');
      setProfileUrl('');
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col pb-12">
      <Header 
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'dashboard' && myProfileId) {
            setSelectedParticipantId(myProfileId);
          }
        }}
        isLoggedIn={myProfileId !== null}
        onSyncSelf={myProfileId ? () => handleSyncParticipant(myProfileId) : undefined}
      />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-6 py-6 relative z-10">
        
        {isLoadingList ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-surface border-[3px] border-black rounded-lg shadow-[4px_4px_0_#000]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-48 bg-surface border-[3px] border-black rounded-lg shadow-[4px_4px_0_#000]" />
              <div className="h-48 bg-surface border-[3px] border-black rounded-lg md:col-span-2 shadow-[4px_4px_0_#000]" />
            </div>
          </div>
        ) : !myProfileId ? (
          <div className="max-w-md w-full mx-auto mt-8 md:mt-16 px-4 animate-scale-in">
            <div className="neobrutal-card text-center p-6 md:p-8 space-y-6">
              
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-lg bg-primary border-[3px] border-black p-0.5 mx-auto shadow-[3px_3px_0px_#000]">
                  <div className="w-full h-full bg-white rounded-md flex items-center justify-center">
                    <TargetIcon className="w-7 h-7 text-secondary" />
                  </div>
                </div>
                <h2 className="text-2xl font-extrabold text-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
                  Arcade Login
                </h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest font-bold">
                  Google Cloud Skills Boost
                </p>
              </div>

              <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
                Masukkan nama panggilan dan URL profil Google Cloud Skills Boost yang sudah disetel ke <strong>Publik</strong> untuk memulai pelacakan.
              </p>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left font-mono text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-text-muted block mb-1.5">Nama Panggilan</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. Fajrin Widianto"
                      disabled={isSubmitting}
                      className="neobrutal-input"
                      required
                    />
                  </div>
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
                </div>

                {loginError && (
                  <div className="text-xs text-white bg-secondary border-[3px] border-black p-3.5 flex items-start gap-2.5 font-bold rounded-lg shadow-[3px_3px_0_#000]">
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting || !name || !profileUrl}
                  className="neobrutal-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <UpdateIcon className="w-4 h-4 animate-spin" />
                      <span>CONNECTING_PROFILE...</span>
                    </>
                  ) : (
                    <span>ENTER THE ARCADE</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="w-full">
            
            {currentView === 'leaderboard' && (
              <div className="max-w-4xl mx-auto transition-all">
                <LeaderboardPanel 
                  participants={participants}
                  selectedId={selectedParticipantId}
                  myProfileId={myProfileId}
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
                  <div className="space-y-6 animate-pulse">
                    <div className="h-28 bg-surface border-[3px] border-black rounded-lg shadow-[4px_4px_0_#000]" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="h-48 bg-surface border-[3px] border-black rounded-lg shadow-[4px_4px_0_#000]" />
                      <div className="h-48 bg-surface border-[3px] border-black rounded-lg md:col-span-2 shadow-[4px_4px_0_#000]" />
                    </div>
                  </div>
                ) : (
                  <Dashboard 
                    participant={selectedParticipant} 
                    badges={badges} 
                    onResetSession={handleResetSession}
                  />
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
