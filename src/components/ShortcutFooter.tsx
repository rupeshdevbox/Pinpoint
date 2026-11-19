import React from 'react';
import type { ExtensionSurfaceMode } from '../types';

interface ShortcutFooterProps {
  resultCount: number;
  surfaceMode: ExtensionSurfaceMode;
  explorerOpen: boolean;
}

export const ShortcutFooter: React.FC<ShortcutFooterProps> = ({
  resultCount,
  surfaceMode,
  explorerOpen,
}) => {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const alt = isMac ? '⌥' : 'Alt';

  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-2 border-t px-3.5 py-1.5 text-[11px] select-none"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
      }}
    >
      <span className="tabular-nums truncate font-medium">
        {explorerOpen
          ? 'Folder & Group Location Explorer'
          : `${resultCount} ${resultCount === 1 ? 'match' : 'matches'}`}
      </span>

      <div className="flex items-center gap-2.5 overflow-hidden">
        {explorerOpen ? (
          <span className="flex items-center gap-1">
            <kbd className="pinpoint-kbd">Esc</kbd>
            <span>Back to search</span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <kbd className="pinpoint-kbd">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pinpoint-kbd">↵</kbd>
              <span>Open</span>
            </span>
            {surfaceMode !== 'sidepanel' && (
              <>
                <span className="hidden items-center gap-1 sm:flex">
                  <kbd className="pinpoint-kbd">{mod}⇧L</kbd>
                  <span>Reveal Folder</span>
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <kbd className="pinpoint-kbd">{alt}C</kbd>
                  <span>Copy</span>
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <kbd className="pinpoint-kbd">E</kbd>
                  <span>Edit/Move</span>
                </span>
              </>
            )}
          </>
        )}
      </div>
    </footer>
  );
};
