'use client';

import React from 'react';
import { CheckCircledIcon, Cross2Icon } from '@radix-ui/react-icons';

interface FacilDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FacilDisclaimerModal({ isOpen, onClose }: FacilDisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-fade-in pointer-events-auto font-mono">
      <div className="neobrutal-card max-w-sm sm:max-w-md w-full !p-4 sm:!p-5 flex flex-col animate-scale-in bg-white border-[3.5px] border-black shadow-[6px_6px_0px_#000] space-y-4 max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-[2.5px] border-black pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-tertiary/10 border border-black rounded text-xs">
              🔒
            </span>
            <h3 className="text-xs sm:text-sm font-black text-black uppercase tracking-wide">
              Komitmen Keamanan & Privasi Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-[1.5px] border-black rounded bg-white hover:bg-secondary hover:text-white transition-colors"
          >
            <Cross2Icon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs text-black/80 font-medium leading-relaxed">
          <div className="p-3 bg-surface-alt border-[2px] border-black rounded-lg space-y-1.5 shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-black uppercase text-tertiary block tracking-widest">
              DISCLAIMER PANEL FASILITATOR
            </span>
            <p className="text-[11px] text-black/90 font-bold leading-normal">
              Sistem ini dirancang khusus untuk membantu Fasilitator memantau perkembangan peserta bimbingan dengan aman dan transparan.
            </p>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-start gap-2.5 p-2 bg-white border border-black/20 rounded">
              <span className="text-sm shrink-0">🛡️</span>
              <div>
                <strong className="text-black block font-bold">Keamanan Data Terenkripsi</strong>
                <span>Seluruh data yang diunggah diolah secara terenkripsi dan terlindungi sesuai standar keamanan sistem.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 bg-white border border-black/20 rounded">
              <span className="text-sm shrink-0">📈</span>
              <div>
                <strong className="text-black block font-bold">Pemantauan Progres Murni</strong>
                <span>Data fasilitator hanya digunakan khusus untuk mengukur poin, game, dan skill badge peserta bimbingan.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 bg-white border border-black/20 rounded">
              <span className="text-sm shrink-0">🚫</span>
              <div>
                <strong className="text-black block font-bold">Bebas Data Sensitif</strong>
                <span>Sistem tidak pernah mengumpulkan, menyimpan, atau memproses data pribadi yang bersifat sensitif.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          className="neobrutal-btn-primary w-full py-2.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shrink-0"
        >
          <CheckCircledIcon className="w-4 h-4" />
          <span>PAHAM & SAYA SETUJU</span>
        </button>
      </div>
    </div>
  );
}
