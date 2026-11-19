import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Copy,
  ExternalLink,
  Folder,
  FolderInput,
  FolderOpen,
  Layers,
  MapPin,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BrowserSnapshotIndex,
  ExplorerTarget,
  UnifiedSearchItem,
} from '../types';
import { getTabGroupBadgeStyle } from '../constants/tabGroupColors';
import { ItemFavicon } from './ItemFavicon';

interface FolderExplorerViewProps {
  target: ExplorerTarget;
  index: BrowserSnapshotIndex;
  resolvedTheme: 'dark' | 'light';
  browserName: 'chrome' | 'firefox' | 'preview';
  onNavigateTarget: (target: ExplorerTarget) => void;
  onClose: () => void;
  onPrimaryAction: (item: UnifiedSearchItem, newBackgroundTab?: boolean) => void;
  onSwitchToTab: (tabId: number, windowId?: number) => void;
  onCopyUrl: (item: UnifiedSearchItem) => void;
  onEditBookmark: (item: UnifiedSearchItem) => void;
  onDeleteBookmark: (item: UnifiedSearchItem) => void;
  onCloseTab: (tabId: number) => void;
  onOpenNativeBookmarkManager: (folderId: string) => void;
}

export const FolderExplorerView: React.FC<FolderExplorerViewProps> = ({
  target,
  index,
  resolvedTheme,
  browserName,
  onNavigateTarget,
  onClose,
  onPrimaryAction,
  onSwitchToTab,
  onCopyUrl,
  onEditBookmark,
  onDeleteBookmark,
  onCloseTab,
  onOpenNativeBookmarkManager,
}) => {
  const [localFilter, setLocalFilter] = useState('');
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalFilter('');
  }, [target]);

  useEffect(() => {
    if (highlightedRef.current && typeof highlightedRef.current.scrollIntoView === 'function') {
      highlightedRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [target]);

  const filterLower = localFilter.trim().toLowerCase();

  // Mode A: Bookmark Folder Explorer
  const folder = target.type === 'folder' ? index.foldersById.get(target.folderId) : undefined;
  const childFolders = useMemo(() => {
    if (!folder) return [];
    return folder.childFolderIds
      .map((id) => index.foldersById.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .filter((f) => !filterLower || f.title.toLowerCase().includes(filterLower));
  }, [folder, index.foldersById, filterLower]);

  const folderBookmarks = useMemo(() => {
    if (!folder) return [];
    return index.bookmarkItems
      .filter((b) => b.parentFolderId === folder.id)
      .filter(
        (b) =>
          !filterLower ||
          b.title.toLowerCase().includes(filterLower) ||
          b.displayUrl.toLowerCase().includes(filterLower)
      );
  }, [folder, index.bookmarkItems, filterLower]);

  // Mode B: Chrome Tab Group Explorer
  const tabGroup =
    target.type === 'tab_group' ? index.tabGroupsById.get(target.groupId) : undefined;
  const groupTabs = useMemo(() => {
    if (!tabGroup) return [];
    return index.tabItems
      .filter((t) => t.tabGroup?.id === tabGroup.id)
      .filter(
        (t) =>
          !filterLower ||
          t.title.toLowerCase().includes(filterLower) ||
          t.displayUrl.toLowerCase().includes(filterLower)
      );
  }, [tabGroup, index.tabItems, filterLower]);

  if (target.type === 'folder') {
    if (!folder) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium">Folder no longer exists</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            Back to search
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Explorer Bar */}
        <div
          className="border-b px-3.5 py-2.5"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                borderColor: 'var(--border-strong)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Search
            </button>

            {(browserName === 'chrome' || browserName === 'preview') && (
              <button
                type="button"
                onClick={() => onOpenNativeBookmarkManager(folder.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
                title="Open this folder inside Chrome Bookmark Manager"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Chrome Bookmarks
              </button>
            )}
          </div>

          {/* Interactive Breadcrumb Path */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1 text-xs">
            <FolderOpen
              className="mr-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: 'var(--folder-tint)' }}
            />
            {folder.path.map((segment, idx) => {
              const segId = folder.pathIds[idx];
              const isCurrent = idx === folder.path.length - 1;
              return (
                <React.Fragment key={segId}>
                  {idx > 0 && (
                    <ChevronRight
                      className="h-3 w-3 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  )}
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() =>
                      onNavigateTarget({
                        type: 'folder',
                        folderId: segId,
                      })
                    }
                    className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                      isCurrent
                        ? 'cursor-default font-semibold'
                        : 'hover:bg-[var(--bg-hover)]'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? 'var(--folder-bg)' : 'transparent',
                      color: isCurrent ? 'var(--folder-tint)' : 'var(--text-secondary)',
                    }}
                  >
                    {segment}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Filter within folder */}
          <div className="relative mt-2 flex items-center">
            <Search
              className="pointer-events-none absolute left-2.5 h-3.5 w-3.5"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              placeholder={`Filter inside "${folder.title}" (${folder.bookmarkCount} bookmarks, ${folder.childFolderIds.length} subfolders)…`}
              className="w-full rounded-lg border py-1.5 pr-7 pl-8 text-xs outline-none placeholder:text-[var(--text-muted)]"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            {localFilter && (
              <button
                type="button"
                onClick={() => setLocalFilter('')}
                className="absolute right-2 rounded p-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Folder Contents */}
        <div className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
          {/* Root Folder Switcher Pills when at top or wanting quick jump */}
          {childFolders.length > 0 && (
            <div className="mb-2 space-y-1">
              <div
                className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Subfolders ({childFolders.length})
              </div>
              {childFolders.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() =>
                    onNavigateTarget({
                      type: 'folder',
                      folderId: sub.id,
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        backgroundColor: 'var(--folder-bg)',
                        borderColor: 'var(--folder-border)',
                        color: 'var(--folder-tint)',
                      }}
                    >
                      <Folder className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate text-[12.5px] font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {sub.title}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {sub.totalBookmarkCount}{' '}
                        {sub.totalBookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          )}

          <div
            className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wider uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Bookmarks in {folder.title} ({folderBookmarks.length})
          </div>

          {folderBookmarks.length === 0 ? (
            <div
              className="rounded-xl border px-4 py-6 text-center text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {localFilter
                ? `No bookmarks in "${folder.title}" match "${localFilter}".`
                : 'No direct bookmarks saved in this folder.'}
            </div>
          ) : (
            folderBookmarks.map((bm) => {
              const isPinpointed = bm.bookmarkId === target.highlightBookmarkId;
              return (
                <div
                  key={bm.uid}
                  ref={isPinpointed ? highlightedRef : null}
                  onClick={() => onPrimaryAction(bm, false)}
                  className="group flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{
                    backgroundColor: isPinpointed ? 'var(--bg-selected)' : 'transparent',
                    borderColor: isPinpointed
                      ? 'var(--bg-selected-border)'
                      : 'transparent',
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <ItemFavicon item={bm} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="truncate text-[13px] font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {bm.title}
                        </span>
                        {isPinpointed && (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: 'var(--bg-chip-active)',
                              borderColor: 'var(--bg-selected-border)',
                              color: 'var(--accent)',
                            }}
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            Located Here
                          </span>
                        )}
                      </div>
                      <div
                        className="truncate text-[11.5px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {bm.displayUrl}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {bm.openTabs.length > 0 && bm.tabId !== undefined && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchToTab(bm.tabId!, bm.windowId);
                        }}
                        className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold"
                        style={{
                          backgroundColor: 'var(--open-bg)',
                          borderColor: 'var(--open-border)',
                          color: 'var(--open-tint)',
                        }}
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Switch
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyUrl(bm);
                      }}
                      title="Copy URL"
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--bg-surface)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBookmark(bm);
                      }}
                      title="Edit or move to another folder"
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--bg-surface)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <FolderInput className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(bm);
                      }}
                      title="Delete bookmark"
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--danger-bg)]"
                      style={{ color: 'var(--danger-tint)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Tab Group Explorer View
  if (!tabGroup) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium">Tab Group is no longer open</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          Back to search
        </button>
      </div>
    );
  }

  const groupStyle = getTabGroupBadgeStyle(tabGroup.color, resolvedTheme);
  const allGroups = Array.from(index.tabGroupsById.values());

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="border-b px-3.5 py-2.5"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Search
          </button>

          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Window {tabGroup.windowNumber} • {tabGroup.collapsed ? 'Collapsed' : 'Expanded'}
          </span>
        </div>

        {/* Tab Group Switcher Pills */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          {allGroups.map((g) => {
            const st = getTabGroupBadgeStyle(g.color, resolvedTheme);
            const active = g.id === tabGroup.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  onNavigateTarget({
                    type: 'tab_group',
                    groupId: g.id,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-semibold transition-opacity"
                style={{
                  color: st.color,
                  backgroundColor: active ? st.backgroundColor : 'transparent',
                  borderColor: active ? st.borderColor : 'var(--border-subtle)',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: st.dotColor }}
                />
                <span>{g.title}</span>
                <span className="opacity-75">({g.tabCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2.5 py-2">
        <div
          className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold"
          style={{ color: groupStyle.color }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: groupStyle.dotColor }}
          />
          <span>
            Tabs in "{tabGroup.title}" ({groupTabs.length})
          </span>
        </div>

        {groupTabs.map((tab) => {
          const isMatched = tab.tabId === target.highlightTabId;
          return (
            <div
              key={tab.uid}
              ref={isMatched ? highlightedRef : null}
              onClick={() => tab.tabId !== undefined && onSwitchToTab(tab.tabId, tab.windowId)}
              className="flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-2.5 py-2 transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                backgroundColor: isMatched ? 'var(--bg-selected)' : 'transparent',
                borderColor: isMatched ? 'var(--bg-selected-border)' : 'transparent',
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <ItemFavicon item={tab} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-[13px] font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tab.title}
                    </span>
                    {isMatched && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-chip-active)',
                          borderColor: 'var(--bg-selected-border)',
                          color: 'var(--accent)',
                        }}
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        Located Here
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {tab.folderBreadcrumb && tab.parentFolderId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateTarget({
                            type: 'folder',
                            folderId: tab.parentFolderId!,
                            highlightBookmarkId: tab.bookmarkId,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10.5px] font-medium"
                        style={{
                          backgroundColor: 'var(--folder-bg)',
                          borderColor: 'var(--folder-border)',
                          color: 'var(--folder-tint)',
                        }}
                      >
                        <FolderOpen className="h-2.5 w-2.5" />
                        <span>Saved in {tab.folderBreadcrumb}</span>
                      </button>
                    )}
                    <span
                      className="truncate text-[11.5px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {tab.displayUrl}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {tab.tabId !== undefined && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchToTab(tab.tabId!, tab.windowId);
                    }}
                    className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      backgroundColor: 'var(--open-bg)',
                      borderColor: 'var(--open-border)',
                      color: 'var(--open-tint)',
                    }}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Switch
                  </button>
                )}
                {tab.tabId !== undefined && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.tabId!);
                    }}
                    title="Close tab"
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--danger-bg)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
