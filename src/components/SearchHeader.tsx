import React, { useState } from 'react';
import {
  HelpCircle,
  Monitor,
  Moon,
  PanelRight,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import type { ExtensionSurfaceMode, ThemeMode } from '../types';
import { BRAND } from '../constants/brand';

interface SearchHeaderProps {
  query: string;
  onQueryChange: (val: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  theme: ThemeMode;
  onCycleTheme: () => void;
  surfaceMode: ExtensionSurfaceMode;
  supportsSidePanel: boolean;
  onOpenSidePanel: () => void;
  preferSwitchToOpenTab: boolean;
  onTogglePreferSwitchToOpenTab: () => void;
}

const OPERATOR_EXAMPLES = [
  { token: 'in:Engineering', desc: 'Inside folder name' },
  { token: 'group:Sprint', desc: 'In Chrome Tab Group' },
  { token: 'site:github.com', desc: 'Filter by domain' },
  { token: 'is:open', desc: 'Currently open in tab' },
  { token: 'is:duplicate', desc: 'Saved in 2+ folders' },
  { token: 'is:unread', desc: 'Unread Reading List' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  query,
  onQueryChange,
  inputRef,
  theme,
  onCycleTheme,
  surfaceMode,
  supportsSidePanel,
  onOpenSidePanel,
  preferSwitchToOpenTab,
  onTogglePreferSwitchToOpenTab,
}) => {
  const [showSyntaxTips, setShowSyntaxTips] = useState(false);

  const appendOperator = (token: string) => {
    const base = query.trim();
    const next = base ? `${base} ${token} ` : `${token} `;
    onQueryChange(next);
    setShowSyntaxTips(false);
    inputRef.current?.focus();
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel =
    theme === 'dark' ? 'Theme: Dark' : theme === 'light' ? 'Theme: Light' : 'Theme: System';

  return (
    <header
      className="relative z-20 border-b px-3.5 pt-3 pb-2.5"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4"
            style={{ color: 'var(--accent)' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search bookmarks, folders, URLs, or Chrome tab groups…"
            aria-label="Search bookmarks, folders, URLs, or Chrome tab groups"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-xl border py-2 pr-16 pl-9 text-[13.5px] font-normal transition-colors outline-none placeholder:text-[var(--text-muted)]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  inputRef.current?.focus();
                }}
                title="Clear search (Esc)"
                aria-label="Clear search"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSyntaxTips((prev) => !prev)}
              title="Search operators & smart filters"
              aria-label="Toggle search syntax tips"
              aria-expanded={showSyntaxTips}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                color: showSyntaxTips ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCycleTheme}
            title={`${themeLabel} (click to switch)`}
            aria-label={themeLabel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <ThemeIcon className="h-3.5 w-3.5" />
          </button>

          {supportsSidePanel && surfaceMode !== 'sidepanel' && (
            <button
              type="button"
              onClick={onOpenSidePanel}
              title="Dock Pinpoint in Side Panel"
              aria-label="Open in Side Panel"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showSyntaxTips && (
        <div
          className="mt-2.5 rounded-xl border p-2.5 text-xs"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className="flex items-center gap-1.5 font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              {BRAND.name} Instant Search Operators
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 select-none">
              <input
                type="checkbox"
                checked={preferSwitchToOpenTab}
                onChange={onTogglePreferSwitchToOpenTab}
                className="rounded accent-indigo-500"
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                Switch to open tab on Enter
              </span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {OPERATOR_EXAMPLES.map((op) => (
              <button
                key={op.token}
                type="button"
                onClick={() => appendOperator(op.token)}
                className="flex flex-col items-start rounded-lg border px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                <code
                  className="font-mono text-[11px] font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  {op.token}
                </code>
                <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {op.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
