'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Lightweight centered modal: backdrop click and Escape close it. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:pt-[12vh]">
      <div
        className="animate-fade-in fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-scale-in relative z-10 w-full max-w-lg rounded-lg border border-border bg-surface-elevated shadow-2xl"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
            <h2 className="text-sm font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
