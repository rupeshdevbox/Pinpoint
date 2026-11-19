import React, { useEffect, useRef } from 'react';
import { Compass, History, LockOpen, SearchX } from 'lucide-react';
import type {
  ExplorerTarget,
  FilterTabId,
  SearchResultItem,
  UnifiedSearchItem,
} from '../types';
import { ResultCard } from './ResultCard';

interface ResultListProps {
  results: SearchResultItem[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  activeTab: FilterTabId;
  query: string;
  onClearQuery: () => void;
  hasHistoryPermission: boolean;
  onGrantHistoryPermission: () => void;
  resolvedTheme: 'dark' | 'light';
  onPrimaryAction: (item: UnifiedSearchItem, newBackgroundTab?: boolean) => void;
  onSwitchToTab: (tabId: number, windowId?: number) => void;
  onRevealExplorer: (target: ExplorerTarget) => void;
  onCopyUrl: (item: UnifiedSearchItem) => void;
  onEditBookmark: (item: UnifiedSearchItem) => void;
  onDeleteBookmark: (item: UnifiedSearchItem) => void;
  onToggleReadingList: (item: UnifiedSearchItem) => void;
  onCloseTab: (tabId: number) => void;
  onOpenDuplicatesView: (urlFilter?: string) => void;
}

export const ResultList: React.FC<ResultListProps> = ({
  results,
  selectedIndex,
  onSelectIndex,
  activeTab,
  query,
  onClearQuery,
  hasHistoryPermission,
  onGrantHistoryPermission,
  resolvedTheme,
  onPrimaryAction,
  onSwitchToTab,
  onRevealExplorer,
  onCopyUrl,
  onEditBookmark,
  onDeleteBookmark,
  onToggleReadingList,
  onCloseTab,
  onOpenDuplicatesView,
}) => {
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const selectedItem = results[selectedIndex];
    if (!selectedItem) return;
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(selectedItem.item.uid)
        : selectedItem.item.uid.replace(/"/g, '\\"');
    const el = container.querySelector(`[data-uid="${escaped}"]`) as HTMLElement | null;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, results]);

  if (activeTab === 'history' && !hasHistoryPermission) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent)',
          }}
        >
          <History className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Search Recently Closed Tabs &amp; Browser History
        </h2>
        <p
          className="mt-1.5 max-w-sm text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Pinpoint keeps optional permissions disabled by default for maximum privacy. Grant local
          access to search your recently closed tabs, closed windows, and 30-day browsing history —
          100% processed inside your browser.
        </p>
        <button
          type="button"
          onClick={onGrantHistoryPermission}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-95"
          style={{
            backgroundColor: 'var(--accent-strong)',
            color: 'var(--accent-contrast)',
          }}
        >
          <LockOpen className="h-3.5 w-3.5" />
          Enable Local History &amp; Closed Tabs
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          {query ? <SearchX className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {query ? `No matches for "${query}"` : 'Nothing in this view yet'}
        </p>
        <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>
          {query
            ? 'Try fewer keywords, switch source tabs, or search by folder name or domain.'
            : 'Saved bookmarks, open tabs, and tab groups will appear here automatically.'}
        </p>
        {query && (
          <button
            type="button"
            onClick={onClearQuery}
            className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            Clear search filter
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={listContainerRef}
      role="listbox"
      aria-label="Search results"
      className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2"
    >
      {results.map((res, idx) => (
        <ResultCard
          key={res.item.uid}
          result={res}
          isSelected={idx === selectedIndex}
          resolvedTheme={resolvedTheme}
          onSelectIndex={() => onSelectIndex(idx)}
          onPrimaryAction={onPrimaryAction}
          onSwitchToTab={onSwitchToTab}
          onRevealExplorer={onRevealExplorer}
          onCopyUrl={onCopyUrl}
          onEditBookmark={onEditBookmark}
          onDeleteBookmark={onDeleteBookmark}
          onToggleReadingList={onToggleReadingList}
          onCloseTab={onCloseTab}
          onOpenDuplicatesView={onOpenDuplicatesView}
        />
      ))}
    </div>
  );
};
