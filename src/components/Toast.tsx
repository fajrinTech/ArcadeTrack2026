'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon, Cross2Icon } from '@radix-ui/react-icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx.toast;
}

const STYLES: Record<ToastType, { bg: string; Icon: typeof CheckCircledIcon }> = {
  success: { bg: 'bg-success text-white', Icon: CheckCircledIcon },
  error: { bg: 'bg-secondary text-white', Icon: CrossCircledIcon },
  info: { bg: 'bg-tertiary text-white', Icon: InfoCircledIcon },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  const { bg, Icon } = STYLES[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      role="status"
      className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 border-[3px] border-black px-4 py-3 rounded-lg shadow-[4px_4px_0px_#000] font-bold text-xs max-w-sm ${bg}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="leading-snug flex-1">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        aria-label="Tutup"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <Cross2Icon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
