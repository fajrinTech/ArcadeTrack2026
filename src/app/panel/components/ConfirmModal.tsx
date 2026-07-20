'use client';

import React from 'react';
import { InfoCircledIcon, ExclamationTriangleIcon, TrashIcon, UpdateIcon } from '@radix-ui/react-icons';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  isConfirmLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'info',
  onConfirm,
  onCancel,
  showCancel = true,
  isConfirmLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  // Icon mapping
  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return <TrashIcon className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
      case 'success':
        return <InfoCircledIcon className="w-6 h-6 text-green-600" />;
      default:
        return <InfoCircledIcon className="w-6 h-6 text-blue-600" />;
    }
  };

  // Neo-brutalist accent styles
  const getThemeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'bg-secondary-light border-red-200',
          btnConfirm: 'bg-secondary hover:bg-secondary-dark text-white',
          cardBorder: 'border-black'
        };
      case 'warning':
        return {
          headerBg: 'bg-yellow-100 border-yellow-200',
          btnConfirm: 'bg-primary hover:bg-yellow-400 text-black',
          cardBorder: 'border-black'
        };
      case 'success':
        return {
          headerBg: 'bg-green-100 border-green-200',
          btnConfirm: 'bg-green-600 hover:bg-green-700 text-white',
          cardBorder: 'border-black'
        };
      default:
        return {
          headerBg: 'bg-[#E1EFFE] border-blue-200',
          btnConfirm: 'bg-[#1E429F] hover:bg-[#1A3B8B] text-white',
          cardBorder: 'border-black'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={showCancel && !isConfirmLoading ? onCancel : undefined}
      />

      {/* Modal Card */}
      <div className={`relative w-full max-w-md bg-white border-[3px] ${theme.cardBorder} rounded-lg shadow-[5px_5px_0px_#000] p-5 space-y-4 animate-scale-in z-10 font-mono`}>
        {/* Header Block */}
        <div className="flex items-center gap-3 border-b-[2.5px] border-black pb-3">
          <div className="p-1.5 border-[2px] border-black rounded bg-white shadow-[1.5px_1.5px_0_#000]">
            {renderIcon()}
          </div>
          <h3 className="text-sm font-black uppercase text-black truncate">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-xs text-text-muted leading-relaxed font-bold uppercase whitespace-pre-line">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t-[2px] border-black">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              disabled={isConfirmLoading}
              className="px-4 py-2 border-[2px] border-black rounded text-xs font-bold bg-white hover:bg-surface-alt active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0_#000] shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={isConfirmLoading}
            className={`px-4 py-2 border-[2px] border-black rounded text-xs font-bold ${theme.btnConfirm} flex items-center gap-1.5 active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-[1px_1px_0_#000] shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50`}
          >
            {isConfirmLoading && <UpdateIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
