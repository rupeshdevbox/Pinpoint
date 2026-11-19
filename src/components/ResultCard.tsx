import React, { useState } from 'react';
import {
  ArrowUpRight,
  BookCheck,
  Check,
  Copy,
  FolderInput,
  FolderOpen,
  FolderSearch,
  Pin,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type { ExplorerTarget, SearchResultItem, UnifiedSearchItem } from '../types';
import { getTabGroupBadgeStyle } from '../constants/tabGroupColors';
import { HighlightedText } from './HighlightedText';
import { ItemFavicon } from './ItemFavicon';

interface ResultCardProps {
  result: SearchResultItem;
  isSelected: boolean;
  resolvedTheme: 'dark' | 'light';
  onSelectIndex: () => void;
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

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  isSelected,
  resolvedTheme,
  onSelectIndex,
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
  const { item } = result;
  const [justCopied, setJustCopied] = useState(false);

  const primaryFolderId =
    item.kind === 'folder' ? item.folderNode?.id : item.parentFolderId;

  const canRevealLocation = Boolean(primaryFolderId || item.tabGroup);

  const handleRevealClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryFolderId) {
      onRevealExplorer({
        type: 'folder',
        folderId: primaryFolderId,
        highlightBookmarkId: item.bookmarkId,
      });
    } else if (item.tabGroup) {
      onRevealExplorer({
        type: 'tab_group',
        groupId: item.tabGroup.id,
        highlightTabId: item.tabId,
      });
    }
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyUrl(item);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1400);
  };

  const tabGroupStyle = item.tabGroup
    ? getTabGroupBadgeStyle(item.tabGroup.color, resolvedTheme)
    : null;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-uid={item.uid}
      onMouseEnter={onSelectIndex}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          onPrimaryAction(item, true);
        } else {
          onPrimaryAction(item, false);
        }
      }}
      className="group relative flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 transition-colors"
      style={{
        backgroundColor: isSelected ? 'var(--bg-selected)' : 'transparent',
        borderColor: isSelected ? 'var(--bg-selected-border)' : 'transparent',
      }}
    >
      <ItemFavicon item={item} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {item.pinned && (
              <span title="Pinned tab" style={{ color: 'var(--accent)' }}>
                <Pin className="h-3 w-3 shrink-0" />
              </span>
            )}
            {item.audible && (
              <span title="Playing audio" style={{ color: 'var(--open-tint)' }}>
                <Volume2 className="h-3 w-3 shrink-0" />
              </span>
            )}
            <span
              className="truncate text-[13px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              <HighlightedText text={item.title} ranges={result.titleRanges} />
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {item.tabGroup && tabGroupStyle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevealExplorer({
                    type: 'tab_group',
                    groupId: item.tabGroup!.id,
                    highlightTabId: item.tabId,
                  });
                }}
                title={`Chrome Tab Group: ${item.tabGroup.title} (Window ${item.tabGroup.windowNumber}) — click to inspect group`}
                className="flex max-w-[140px] items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  color: tabGroupStyle.color,
                  backgroundColor: tabGroupStyle.backgroundColor,
                  borderColor: tabGroupStyle.borderColor,
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tabGroupStyle.dotColor }}
                />
                <span className="truncate">
                  {item.kind === 'tab_group' ? 'Tab Group' : item.tabGroup.title}
                </span>
              </button>
            )}

            {(item.kind === 'tab' || item.openTabs.length > 0) && item.tabId !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchToTab(item.tabId!, item.windowId);
                }}
                title={`Switch to open tab in Window ${item.windowNumber ?? 1}`}
                className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--open-bg)',
                  borderColor: 'var(--open-border)',
                  color: 'var(--open-tint)',
                }}
              >
                <ArrowUpRight className="h-3 w-3" />
                <span>
                  {item.active && item.kind === 'tab'
                    ? `Active • W${item.windowNumber ?? 1}`
                    : `Switch • W${item.windowNumber ?? 1}`}
                </span>
              </button>
            )}

            {item.kind === 'reading_list' && (
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: item.hasBeenRead ? 'var(--bg-chip)' : 'var(--bg-chip-active)',
                  borderColor: item.hasBeenRead
                    ? 'var(--border-subtle)'
                    : 'var(--bg-selected-border)',
                  color: item.hasBeenRead ? 'var(--text-muted)' : 'var(--accent)',
                }}
              >
                {item.hasBeenRead ? 'Read' : 'Unread'}
              </span>
            )}

            {item.kind === 'closed_tab' && (
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-chip)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Recently Closed
              </span>
            )}

            {item.isDuplicate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDuplicatesView(item.domain);
                }}
                title={`Saved in ${item.duplicateCount} bookmark folders — click to inspect duplicates`}
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--dup-bg)',
                  borderColor: 'var(--dup-border)',
                  color: 'var(--dup-tint)',
                }}
              >
                {item.duplicateCount}× Saved
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            {item.folderBreadcrumb && primaryFolderId && (
              <button
                type="button"
                onClick={handleRevealClick}
                title={`Saved in: ${item.folderBreadcrumb} — click to reveal in folder`}
                className="inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--folder-bg)',
                  borderColor: 'var(--folder-border)',
                  color: 'var(--folder-tint)',
                }}
              >
                <FolderOpen className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  <HighlightedText
                    text={item.folderBreadcrumb}
                    ranges={result.locationRanges}
                  />
                </span>
                {item.savedLocations.length > 1 && (
                  <span className="shrink-0 opacity-80">
                    (+{item.savedLocations.length - 1})
                  </span>
                )}
              </button>
            )}

            {item.displayUrl && (
              <span
                className="truncate text-[11.5px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <HighlightedText text={item.displayUrl} ranges={result.urlRanges} />
              </span>
            )}
          </div>

          <div
            className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {canRevealLocation && (
              <button
                type="button"
                onClick={handleRevealClick}
                title="Reveal in Folder / Tab Group (⌘⇧L)"
                aria-label="Reveal in Folder or Tab Group"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <FolderSearch className="h-3.5 w-3.5" />
              </button>
            )}

            {item.url && (
              <button
                type="button"
                onClick={handleCopyClick}
                title="Copy URL (Alt+C)"
                aria-label="Copy URL"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  color: justCopied ? 'var(--open-tint)' : 'var(--text-secondary)',
                }}
              >
                {justCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {item.bookmarkId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBookmark(item);
                }}
                title="Edit or move bookmark to another folder (E)"
                aria-label="Edit or move bookmark"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <FolderInput className="h-3.5 w-3.5" />
              </button>
            )}

            {item.kind === 'reading_list' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReadingList(item);
                }}
                title={item.hasBeenRead ? 'Mark as Unread' : 'Mark as Read'}
                aria-label={item.hasBeenRead ? 'Mark as Unread' : 'Mark as Read'}
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <BookCheck className="h-3.5 w-3.5" />
              </button>
            )}

            {item.kind === 'bookmark' && item.bookmarkId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBookmark(item);
                }}
                title="Delete bookmark (with Undo)"
                aria-label="Delete bookmark"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--danger-bg)]"
                style={{ color: 'var(--danger-tint)' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {item.kind === 'tab' && item.tabId !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(item.tabId!);
                }}
                title="Close open tab"
                aria-label="Close open tab"
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--danger-bg)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
