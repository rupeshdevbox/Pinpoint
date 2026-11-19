import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { DuplicateCluster, ExplorerTarget, UnifiedSearchItem } from '../types';
import { ItemFavicon } from './ItemFavicon';

interface DuplicateFinderViewProps {
  clusters: DuplicateCluster[];
  query: string;
  onRevealExplorer: (target: ExplorerTarget) => void;
  onKeepOnlyCopy: (keepBookmarkId: string, cluster: DuplicateCluster) => void;
  onCleanAllDuplicates: () => void;
  onDeleteBookmark: (item: UnifiedSearchItem) => void;
  onPrimaryAction: (item: UnifiedSearchItem) => void;
  onSwitchToTab: (tabId: number, windowId?: number) => void;
}

export const DuplicateFinderView: React.FC<DuplicateFinderViewProps> = ({
  clusters,
  query,
  onRevealExplorer,
  onKeepOnlyCopy,
  onCleanAllDuplicates,
  onDeleteBookmark,
  onPrimaryAction,
  onSwitchToTab,
}) => {
  const filteredClusters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clusters;
    return clusters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.displayUrl.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.items.some((item) => item.folderBreadcrumb.toLowerCase().includes(q))
    );
  }, [clusters, query]);

  const redundantCount = useMemo(
    () => filteredClusters.reduce((acc, c) => acc + Math.max(0, c.items.length - 1), 0),
    [filteredClusters]
  );

  if (clusters.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border"
          style={{
            backgroundColor: 'var(--open-bg)',
            borderColor: 'var(--open-border)',
            color: 'var(--open-tint)',
          }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Zero Duplicate Bookmarks!
        </h2>
        <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>
          Every saved URL in your browser lives in a single clean bookmark location.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Summary Action Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{filteredClusters.length}</strong>{' '}
          {filteredClusters.length === 1 ? 'URL saved' : 'URLs saved'} across multiple folders (
          <strong style={{ color: 'var(--dup-tint)' }}>{redundantCount} redundant</strong>)
        </div>

        {redundantCount > 0 && (
          <button
            type="button"
            onClick={onCleanAllDuplicates}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-95"
            style={{
              backgroundColor: 'var(--accent-strong)',
              color: 'var(--accent-contrast)',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Clean Up All ({redundantCount})
          </button>
        )}
      </div>

      {/* Duplicate Clusters List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        {filteredClusters.map((cluster) => {
          const sampleItem = cluster.items[0];
          const primaryOpenTab = cluster.openTabs[0];

          return (
            <div
              key={cluster.normalizedUrl}
              className="rounded-xl border p-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  onClick={() => onPrimaryAction(sampleItem)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5"
                >
                  <ItemFavicon item={sampleItem} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[13px] font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {cluster.title}
                    </div>
                    <div
                      className="truncate text-[11.5px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {cluster.displayUrl}
                    </div>
                  </div>
                </div>

                {primaryOpenTab && (
                  <button
                    type="button"
                    onClick={() =>
                      onSwitchToTab(primaryOpenTab.tabId, primaryOpenTab.windowId)
                    }
                    className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      backgroundColor: 'var(--open-bg)',
                      borderColor: 'var(--open-border)',
                      color: 'var(--open-tint)',
                    }}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Open in W{primaryOpenTab.windowNumber}
                  </button>
                )}
              </div>

              {/* Individual Folder Copies */}
              <div className="mt-2 space-y-1">
                {cluster.items.map((copyItem, copyIdx) => (
                  <div
                    key={copyItem.uid}
                    className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-app)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        copyItem.parentFolderId &&
                        onRevealExplorer({
                          type: 'folder',
                          folderId: copyItem.parentFolderId,
                          highlightBookmarkId: copyItem.bookmarkId,
                        })
                      }
                      className="flex min-w-0 items-center gap-1.5 text-left font-medium hover:underline"
                      style={{ color: 'var(--folder-tint)' }}
                    >
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{copyItem.folderBreadcrumb}</span>
                      {copyIdx === 0 && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.2 text-[10px]"
                          style={{
                            backgroundColor: 'var(--bg-chip)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          Original
                        </span>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {copyItem.bookmarkId && (
                        <button
                          type="button"
                          onClick={() => onKeepOnlyCopy(copyItem.bookmarkId!, cluster)}
                          className="rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-colors hover:bg-[var(--bg-hover)]"
                          style={{
                            borderColor: 'var(--border-strong)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Keep Only This
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteBookmark(copyItem)}
                        title="Delete this copy"
                        aria-label="Delete this duplicate copy"
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--danger-bg)]"
                        style={{ color: 'var(--danger-tint)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
