'use client';

import React from 'react';
import { Cross2Icon, ExclamationTriangleIcon, UpdateIcon, CheckCircledIcon } from '@radix-ui/react-icons';

interface ImportCSVModalProps {
  isOpen: boolean;
  isImporting: boolean;
  modalStats: {
    total: number;
    invalidUrls: number;
    totalGames: number;
    totalSkills: number;
  };
  isDuplicate?: boolean;
  uploadFilename?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ImportCSVModal({
  isOpen,
  isImporting,
  modalStats,
  isDuplicate = false,
  uploadFilename = '',
  onClose,
  onConfirm
}: ImportCSVModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in pointer-events-auto">
      <div className="neobrutal-card max-w-sm sm:max-w-md w-full !p-4 sm:!p-6 flex flex-col animate-scale-in bg-white shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-[3px] border-black pb-3 shrink-0">
          <h3 className="text-base font-black text-black uppercase">
            Verifikasi Data CSV
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 border-[2px] border-black rounded bg-white hover:bg-secondary hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1.5px_1.5px_0px_#000] transition-all"
          >
            <Cross2Icon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="my-4 sm:my-6 space-y-4">
          {/* Warning Banner when Duplicate is Detected */}
          {isDuplicate && (
            <div className="bg-amber-100 border-[3px] border-black p-3.5 rounded shadow-[3px_3px_0_#000] flex items-start gap-2.5">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-amber-900 block">
                  ⚠️ FILE DUPLIKAT TERDETEKSI
                </span>
                <p className="text-[11px] text-amber-900 font-bold leading-snug">
                  File <span className="underline font-black">"{uploadFilename}"</span> dengan <span className="font-black">{modalStats.total} data</span> sudah pernah diunggah sebelumnya pada riwayat unggahan Anda.
                </p>
              </div>
            </div>
          )}

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
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 border-[2.5px] border-black rounded text-xs font-bold bg-white hover:bg-surface-alt active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] shadow-[2.5px_2.5px_0px_#000] transition-all"
          >
            {isDuplicate ? 'TUTUP' : 'BATAL'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isImporting || isDuplicate}
            className={`neobrutal-btn-primary !py-2 !px-3 sm:!px-4 flex items-center gap-1.5 text-xs font-bold shrink-0 ${isDuplicate ? 'opacity-50 cursor-not-allowed !bg-gray-400 border-black' : ''
              }`}
          >
            {isImporting ? (
              <>
                <UpdateIcon className="w-3.5 h-3.5 animate-spin" />
                <span>MENYIMPAN...</span>
              </>
            ) : isDuplicate ? (
              <>
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                <span>FILE SUDAH DIUNGGAH</span>
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
  );
}
