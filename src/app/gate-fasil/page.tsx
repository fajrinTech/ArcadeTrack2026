'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { UpdateIcon, ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export default function GateFasilPage() {
  const toast = useToast();
  const [profileUrl, setProfileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_url: profileUrl, role: 'facilitator' })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal mendaftarkan fasilitator. Pastikan URL profil Google Cloud Skills Boost Anda valid dan disetel ke Publik.');
      }

      const data = await res.json();
      setSuccessMsg(`Berhasil mendaftarkan/upgrade "${data.name}" sebagai Fasilitator!`);
      toast('Registrasi Fasilitator sukses.', 'success');
      setProfileUrl('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Koneksi bermasalah. Silakan coba lagi.');
      toast('Registrasi Fasilitator gagal.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center items-center pb-12 px-4">
      <div className="max-w-md w-full animate-scale-in">
        <div className="neobrutal-card text-center p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden border-[3px] border-black mx-auto shadow-[3px_3px_0px_#000]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/500px.png" alt="Arcade Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-extrabold text-black tracking-tight uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              Facilitator Gate
            </h2>
            <p className="text-xs text-secondary font-mono uppercase tracking-widest font-bold">
              Upgrade / Register Fasilitator
            </p>
          </div>

          <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
            Masukkan URL profil Google Cloud Skills Boost yang akan dijadikan/di-upgrade menjadi <strong>Fasilitator</strong> pada sistem ini.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left font-mono text-xs">
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

            {errorMsg && (
              <div className="text-xs text-white bg-secondary border-[3px] border-black p-3.5 flex items-start gap-2.5 font-bold rounded-lg shadow-[3px_3px_0_#000]">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-xs text-white bg-success border-[3px] border-black p-3.5 flex items-start gap-2.5 font-bold rounded-lg shadow-[3px_3px_0_#000]">
                <CheckCircledIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
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
                  <span>PROCESSING...</span>
                </>
              ) : (
                <span>REGISTER AS FACILITATOR</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t-[3px] border-black">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-secondary transition-colors font-bold uppercase"
            >
              ← Kembali ke Login Utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
