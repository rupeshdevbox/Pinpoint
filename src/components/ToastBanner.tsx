import React from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import type { UndoSnapshot } from '../types';

export interface ToastMessage {
  id: string;
  text: string;
  undoSnapshot?: UndoSnapshot;
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onUndo: (snapshot: UndoSnapshot) => void;
  onDismiss: () => void;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast, onUndo, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto absolute right-3.5 bottom-10 left-3.5 z-30 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--open-tint)' }} />
        <span className="truncate font-medium">{toast.text}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {toast.undoSnapshot && (
          <button
            type="button"
            onClick={() => onUndo(toast.undoSnapshot!)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-strong)',
              color: 'var(--accent-contrast)',
            }}
          >
            <RotateCcw className="h-3 w-3" />
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded p-1 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
