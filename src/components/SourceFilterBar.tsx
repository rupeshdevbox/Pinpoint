import React from 'react';
import {
  Bookmark,
  BookOpen,
  Copy,
  FolderTree,
  Globe,
  History,
  Layers,
  LockOpen,
} from 'lucide-react';
import type { BrowserCapabilities, BrowserSnapshotIndex, FilterTabId } from '../types';

interface SourceFilterBarProps {
  activeTab: FilterTabId;
  onSelectTab: (tab: FilterTabId) => void;
  counts: BrowserSnapshotIndex['counts'];
  capabilities: BrowserCapabilities;
  hasHistoryPermission: boolean;
}

export const SourceFilterBar: React.FC<SourceFilterBarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  capabilities,
  hasHistoryPermission,
}) => {
  const tabs: Array<{
    id: FilterTabId;
    label: string;
    countLabel: string | number;
    icon: React.FC<{ className?: string }>;
    visible: boolean;
    accentBadge?: boolean;
  }> = [
    {
      id: 'all',
      label: 'All',
      countLabel: counts.all,
      icon: Layers,
      visible: true,
    },
    {
      id: 'bookmarks',
      label: 'Saved',
      countLabel: counts.bookmarks,
      icon: Bookmark,
      visible: true,
    },
    {
      id: 'tabs',
      label: 'Tabs',
      countLabel: counts.tabs,
      icon: Globe,
      visible: true,
    },
    {
      id: 'folders',
      label: 'Folders',
      countLabel: counts.folders,
      icon: FolderTree,
      visible: true,
    },
    {
      id: 'reading_list',
      label: 'Reading',
      countLabel: counts.readingList,
      icon: BookOpen,
      visible: capabilities.supportsReadingList || counts.readingList > 0,
    },
    {
      id: 'duplicates',
      label: 'Dupes',
      countLabel: counts.duplicates,
      icon: Copy,
      visible: true,
      accentBadge: counts.duplicates > 0,
    },
    {
      id: 'history',
      label: 'History',
      countLabel: hasHistoryPermission ? counts.history : '+',
      icon: hasHistoryPermission ? History : LockOpen,
      visible: capabilities.supportsOptionalHistory,
    },
  ];

  return (
    <nav
      aria-label="Filter search sources"
      className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b px-2.5 py-1.5"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {tabs
        .filter((t) => t.visible)
        .map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                onSelectTab(tab.id);
                e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' });
              }}
              aria-pressed={isActive}
              className="flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] font-medium transition-all select-none"
              style={{
                backgroundColor: isActive ? 'var(--bg-chip-active)' : 'transparent',
                borderColor: isActive ? 'var(--bg-selected-border)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
              <span
                className="tabular-nums rounded-full px-1.5 py-0.2 text-[10.5px] font-semibold"
                style={{
                  backgroundColor:
                    tab.accentBadge && !isActive
                      ? 'var(--dup-bg)'
                      : isActive
                        ? 'var(--bg-chip)'
                        : 'var(--bg-chip)',
                  color:
                    tab.accentBadge && !isActive
                      ? 'var(--dup-tint)'
                      : isActive
                        ? 'var(--accent)'
                        : 'var(--text-muted)',
                }}
              >
                {tab.countLabel}
              </span>
            </button>
          );
        })}
    </nav>
  );
};
