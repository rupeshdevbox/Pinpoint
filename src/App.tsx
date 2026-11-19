import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppWindow, Maximize2, PanelRight } from 'lucide-react';
import type {
  BrowserSnapshotIndex,
  DuplicateCluster,
  ExplorerTarget,
  ExtensionSurfaceMode,
  FilterTabId,
  RawBrowserSnapshot,
  ThemeMode,
  UndoSnapshot,
  UnifiedSearchItem,
  UserPreferences,
} from './types';
import {
  DEFAULT_USER_PREFERENCES,
  activateOpenTab,
  applyUndoSnapshot,
  closeBrowserTab,
  createBookmarkSubfolder,
  deleteBookmarksWithUndo,
  fetchBrowserSnapshot,
  getBrowserCapabilities,
  loadUserPreferences,
  moveBookmarkToFolder,
  openFolderInNativeManager,
  openInSidePanel,
  openItemUrl,
  requestHistoryAndSessionsPermission,
  saveUserPreferences,
  subscribeToBrowserChanges,
  toggleReadingListRead,
  updateBookmarkDetails,
} from './adapters/browserAdapter';
import { buildBrowserSnapshotIndex } from './engine/indexer';
import { searchSnapshot } from './engine/searchEngine';
import { BRAND } from './constants/brand';
import { SearchHeader } from './components/SearchHeader';
import { SourceFilterBar } from './components/SourceFilterBar';
import { ResultList } from './components/ResultList';
import { FolderExplorerView } from './components/FolderExplorerView';
import { BookmarkEditModal } from './components/BookmarkEditModal';
import { DuplicateFinderView } from './components/DuplicateFinderView';
import { ToastBanner, type ToastMessage } from './components/ToastBanner';
import { ShortcutFooter } from './components/ShortcutFooter';

const EMPTY_SNAPSHOT: RawBrowserSnapshot = {
  bookmarkTree: [],
  openTabs: [],
  tabGroups: [],
  readingList: [],
  historyAndSessions: [],
  hasHistoryPermission: false,
};

function detectInitialSurface(): ExtensionSurfaceMode {
  const attr = document.documentElement.dataset.surface;
  if (attr === 'popup' || attr === 'sidepanel' || attr === 'preview') {
    return attr;
  }
  return 'popup';
}

export const App: React.FC = () => {
  const initialSurface = useMemo(detectInitialSurface, []);
  const [previewViewport, setPreviewViewport] = useState<'popup' | 'sidepanel' | 'full'>(
    'popup'
  );
  const capabilities = useMemo(getBrowserCapabilities, []);

  const [rawSnapshot, setRawSnapshot] = useState<RawBrowserSnapshot>(EMPTY_SNAPSHOT);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTabId>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [explorerTarget, setExplorerTarget] = useState<ExplorerTarget | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<UnifiedSearchItem | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, undoSnapshot?: UndoSnapshot) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({
      id: `toast-${Date.now()}`,
      text,
      undoSnapshot,
    });
    toastTimerRef.current = setTimeout(
      () => {
        setToast(null);
      },
      undoSnapshot ? 7000 : 3200
    );
  }, []);

  const refreshData = useCallback(async () => {
    const snap = await fetchBrowserSnapshot();
    setRawSnapshot(snap);
  }, []);

  useEffect(() => {
    loadUserPreferences().then((loaded) => {
      setPrefs(loaded);
      setActiveTab(loaded.defaultFilter || 'all');
    });
    refreshData();
    const unsub = subscribeToBrowserChanges(() => {
      refreshData();
    });
    return () => {
      unsub();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [refreshData]);

  // Watch OS color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    prefs.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const updatePrefs = useCallback((updater: (prev: UserPreferences) => UserPreferences) => {
    setPrefs((prev) => {
      const next = updater(prev);
      saveUserPreferences(next);
      return next;
    });
  }, []);

  const handleCycleTheme = useCallback(() => {
    const order: ThemeMode[] = ['system', 'dark', 'light'];
    updatePrefs((prev) => {
      const nextTheme = order[(order.indexOf(prev.theme) + 1) % order.length];
      return { ...prev, theme: nextTheme };
    });
  }, [updatePrefs]);

  const index: BrowserSnapshotIndex = useMemo(
    () => buildBrowserSnapshotIndex(rawSnapshot),
    [rawSnapshot]
  );

  const results = useMemo(
    () => searchSnapshot(index, query, activeTab),
    [index, query, activeTab]
  );

  // Keep selectedIndex in bounds when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  useEffect(() => {
    if (selectedIndex >= results.length && results.length > 0) {
      setSelectedIndex(results.length - 1);
    }
  }, [results.length, selectedIndex]);

  const handleCopyUrl = useCallback(
    async (item: UnifiedSearchItem) => {
      if (!item.url) return;
      try {
        await navigator.clipboard.writeText(item.url);
        showToast(`Copied URL: ${item.displayUrl}`);
      } catch {
        showToast('Could not access clipboard');
      }
    },
    [showToast]
  );

  const handleSwitchToTab = useCallback(
    async (tabId: number, windowId?: number) => {
      await activateOpenTab(tabId, windowId, {
        closePopup: initialSurface === 'popup',
      });
      if (initialSurface === 'preview') {
        showToast(`Switched to open tab in Window ${windowId ?? 1}`);
      }
    },
    [initialSurface, showToast]
  );

  const handlePrimaryAction = useCallback(
    async (item: UnifiedSearchItem, newBackgroundTab = false) => {
      if (item.kind === 'folder' && item.folderNode) {
        setExplorerTarget({
          type: 'folder',
          folderId: item.folderNode.id,
        });
        return;
      }

      if (item.kind === 'tab_group' && item.tabGroup) {
        setExplorerTarget({
          type: 'tab_group',
          groupId: item.tabGroup.id,
        });
        return;
      }

      if (
        !newBackgroundTab &&
        (item.kind === 'tab' ||
          (prefs.preferSwitchToOpenTab && item.openTabs.length > 0)) &&
        item.tabId !== undefined
      ) {
        await handleSwitchToTab(item.tabId, item.windowId);
        return;
      }

      const res = await openItemUrl(item.url, {
        newBackgroundTab,
        closePopup: initialSurface === 'popup' && !newBackgroundTab,
      });

      if (res.status === 'bookmarklet') {
        await handleCopyUrl(item);
        showToast('Bookmarklet code copied to clipboard for safety');
      } else if (newBackgroundTab) {
        showToast(`Opened "${item.title}" in background tab`);
      }
    },
    [
      prefs.preferSwitchToOpenTab,
      handleSwitchToTab,
      initialSurface,
      handleCopyUrl,
      showToast,
    ]
  );

  const handleGrantHistoryPermission = useCallback(async () => {
    const granted = await requestHistoryAndSessionsPermission();
    if (granted) {
      await refreshData();
      showToast('History & Recently Closed tabs unlocked');
    } else {
      showToast('History permission was not granted');
    }
  }, [refreshData, showToast]);

  const handleDeleteBookmark = useCallback(
    async (item: UnifiedSearchItem) => {
      if (!item.bookmarkId) return;
      const undo = await deleteBookmarksWithUndo([item.bookmarkId]);
      await refreshData();
      if (undo) {
        showToast(undo.label, undo);
      }
    },
    [refreshData, showToast]
  );

  const handleSaveBookmarkModal = useCallback(
    async (
      bookmarkId: string,
      updates: { title: string; url: string; targetFolderId: string }
    ) => {
      await updateBookmarkDetails(bookmarkId, {
        title: updates.title,
        url: updates.url,
      });
      const moveUndo = await moveBookmarkToFolder(bookmarkId, updates.targetFolderId);
      await refreshData();
      if (moveUndo) {
        const destFolder = index.foldersById.get(updates.targetFolderId);
        showToast(
          `Moved to "${destFolder?.pathString ?? 'Selected Folder'}"`,
          moveUndo
        );
      } else {
        showToast(`Saved "${updates.title}"`);
      }
    },
    [index.foldersById, refreshData, showToast]
  );

  const handleCreateSubfolder = useCallback(
    async (parentFolderId: string, folderName: string) => {
      const id = await createBookmarkSubfolder(parentFolderId, folderName);
      await refreshData();
      showToast(`Created subfolder "${folderName}"`);
      return id;
    },
    [refreshData, showToast]
  );

  const handleKeepOnlyDuplicateCopy = useCallback(
    async (keepBookmarkId: string, cluster: DuplicateCluster) => {
      const toRemove = cluster.items
        .map((i) => i.bookmarkId)
        .filter((id): id is string => Boolean(id && id !== keepBookmarkId));
      const undo = await deleteBookmarksWithUndo(
        toRemove,
        `Cleaned ${toRemove.length} duplicate ${toRemove.length === 1 ? 'copy' : 'copies'}`
      );
      await refreshData();
      if (undo) showToast(undo.label, undo);
    },
    [refreshData, showToast]
  );

  const handleCleanAllDuplicates = useCallback(async () => {
    const idsToDelete: string[] = [];
    for (const cluster of index.duplicateClusters) {
      for (let i = 1; i < cluster.items.length; i++) {
        const id = cluster.items[i].bookmarkId;
        if (id) idsToDelete.push(id);
      }
    }
    const undo = await deleteBookmarksWithUndo(
      idsToDelete,
      `Cleaned up ${idsToDelete.length} redundant duplicate bookmarks`
    );
    await refreshData();
    if (undo) showToast(undo.label, undo);
  }, [index.duplicateClusters, refreshData, showToast]);

  const handleUndo = useCallback(
    async (snapshot: UndoSnapshot) => {
      await applyUndoSnapshot(snapshot);
      await refreshData();
      showToast('Action undone — restored original location');
    },
    [refreshData, showToast]
  );

  const handleToggleReadingList = useCallback(
    async (item: UnifiedSearchItem) => {
      await toggleReadingListRead(item.url, !item.hasBeenRead);
      await refreshData();
      showToast(item.hasBeenRead ? 'Marked as unread' : 'Marked as read');
    },
    [refreshData, showToast]
  );

  const handleCloseTab = useCallback(
    async (tabId: number) => {
      await closeBrowserTab(tabId);
      await refreshData();
      showToast('Closed browser tab');
    },
    [refreshData, showToast]
  );

  const handleOpenSidePanelAction = useCallback(async () => {
    if (initialSurface === 'preview') {
      setPreviewViewport('sidepanel');
      showToast('Switched preview to Chrome Side Panel layout');
      return;
    }
    const ok = await openInSidePanel();
    if (!ok) {
      showToast('Side Panel is available in Chrome & Firefox sidebar');
    }
  }, [initialSurface, showToast]);

  const handleOpenNativeManager = useCallback(
    async (folderId: string) => {
      if (initialSurface === 'preview') {
        showToast(`Opens chrome://bookmarks/?id=${folderId} in Chrome`);
        return;
      }
      await openFolderInNativeManager(folderId);
    },
    [initialSurface, showToast]
  );

  // Global keyboard shortcuts inside Popup / Side Panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingBookmark) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingBookmark(null);
        }
        return;
      }

      const targetEl = e.target as HTMLElement | null;
      const isTypingInInput =
        targetEl?.tagName === 'INPUT' || targetEl?.tagName === 'TEXTAREA';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setExplorerTarget(null);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'z' &&
        toast?.undoSnapshot &&
        !isTypingInInput
      ) {
        e.preventDefault();
        handleUndo(toast.undoSnapshot);
        return;
      }

      if (e.key === 'Escape') {
        if (explorerTarget) {
          e.preventDefault();
          setExplorerTarget(null);
          requestAnimationFrame(() => searchInputRef.current?.focus());
          return;
        }
        if (query) {
          e.preventDefault();
          setQuery('');
          return;
        }
        if (initialSurface === 'popup') {
          window.close();
        }
        return;
      }

      if (explorerTarget || activeTab === 'duplicates') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length === 0 ? 0 : (prev + 1) % results.length
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length === 0 ? 0 : (prev - 1 + results.length) % results.length
        );
        return;
      }

      const currentItem = results[selectedIndex]?.item;
      if (!currentItem) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrimaryAction(currentItem, e.metaKey || e.ctrlKey);
        return;
      }

      // Cmd/Ctrl + Shift + L -> Reveal in Folder / Tab Group
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const folderId =
          currentItem.kind === 'folder'
            ? currentItem.folderNode?.id
            : currentItem.parentFolderId;
        if (folderId) {
          setExplorerTarget({
            type: 'folder',
            folderId,
            highlightBookmarkId: currentItem.bookmarkId,
          });
        } else if (currentItem.tabGroup) {
          setExplorerTarget({
            type: 'tab_group',
            groupId: currentItem.tabGroup.id,
            highlightTabId: currentItem.tabId,
          });
        }
        return;
      }

      // Alt + C -> Copy URL
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyUrl(currentItem);
        return;
      }

      // Cmd/Ctrl + E or plain E when not typing -> Edit/Move bookmark
      if (
        currentItem.bookmarkId &&
        (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') ||
          (!isTypingInInput && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'e'))
      ) {
        e.preventDefault();
        setEditingBookmark(currentItem);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    editingBookmark,
    explorerTarget,
    activeTab,
    query,
    initialSurface,
    results,
    selectedIndex,
    toast,
    handleUndo,
    handlePrimaryAction,
    handleCopyUrl,
  ]);

  const effectiveSurfaceMode: ExtensionSurfaceMode =
    initialSurface === 'preview'
      ? previewViewport === 'sidepanel'
        ? 'sidepanel'
        : 'popup'
      : initialSurface;

  const corePanel = (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <SearchHeader
        query={query}
        onQueryChange={(val) => {
          setQuery(val);
          if (explorerTarget) setExplorerTarget(null);
        }}
        inputRef={searchInputRef}
        theme={prefs.theme}
        onCycleTheme={handleCycleTheme}
        surfaceMode={effectiveSurfaceMode}
        supportsSidePanel={capabilities.supportsSidePanel}
        onOpenSidePanel={handleOpenSidePanelAction}
        preferSwitchToOpenTab={prefs.preferSwitchToOpenTab}
        onTogglePreferSwitchToOpenTab={() =>
          updatePrefs((p) => ({ ...p, preferSwitchToOpenTab: !p.preferSwitchToOpenTab }))
        }
      />

      {!explorerTarget && (
        <SourceFilterBar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            searchInputRef.current?.focus();
          }}
          counts={index.counts}
          capabilities={capabilities}
          hasHistoryPermission={rawSnapshot.hasHistoryPermission}
        />
      )}

      {explorerTarget ? (
        <FolderExplorerView
          target={explorerTarget}
          index={index}
          resolvedTheme={resolvedTheme}
          browserName={capabilities.browserName}
          onNavigateTarget={setExplorerTarget}
          onClose={() => {
            setExplorerTarget(null);
            requestAnimationFrame(() => searchInputRef.current?.focus());
          }}
          onPrimaryAction={handlePrimaryAction}
          onSwitchToTab={handleSwitchToTab}
          onCopyUrl={handleCopyUrl}
          onEditBookmark={setEditingBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onCloseTab={handleCloseTab}
          onOpenNativeBookmarkManager={handleOpenNativeManager}
        />
      ) : activeTab === 'duplicates' ? (
        <DuplicateFinderView
          clusters={index.duplicateClusters}
          query={query}
          onRevealExplorer={setExplorerTarget}
          onKeepOnlyCopy={handleKeepOnlyDuplicateCopy}
          onCleanAllDuplicates={handleCleanAllDuplicates}
          onDeleteBookmark={handleDeleteBookmark}
          onPrimaryAction={(item) => handlePrimaryAction(item, false)}
          onSwitchToTab={handleSwitchToTab}
        />
      ) : (
        <ResultList
          results={results}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          activeTab={activeTab}
          query={query}
          onClearQuery={() => {
            setQuery('');
            searchInputRef.current?.focus();
          }}
          hasHistoryPermission={rawSnapshot.hasHistoryPermission}
          onGrantHistoryPermission={handleGrantHistoryPermission}
          resolvedTheme={resolvedTheme}
          onPrimaryAction={handlePrimaryAction}
          onSwitchToTab={handleSwitchToTab}
          onRevealExplorer={setExplorerTarget}
          onCopyUrl={handleCopyUrl}
          onEditBookmark={setEditingBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onToggleReadingList={handleToggleReadingList}
          onCloseTab={handleCloseTab}
          onOpenDuplicatesView={() => setActiveTab('duplicates')}
        />
      )}

      <ToastBanner
        toast={toast}
        onUndo={handleUndo}
        onDismiss={() => setToast(null)}
      />

      <ShortcutFooter
        resultCount={
          activeTab === 'duplicates' ? index.duplicateClusters.length : results.length
        }
        surfaceMode={effectiveSurfaceMode}
        explorerOpen={Boolean(explorerTarget)}
      />

      <BookmarkEditModal
        bookmark={editingBookmark}
        folders={index.folderList}
        onClose={() => setEditingBookmark(null)}
        onSave={handleSaveBookmarkModal}
        onCreateSubfolder={handleCreateSubfolder}
        onDelete={handleDeleteBookmark}
      />
    </div>
  );

  // Real Chrome / Firefox Popup or Side Panel mounts edge-to-edge
  if (initialSurface !== 'preview') {
    return <div className="h-screen w-full overflow-hidden">{corePanel}</div>;
  }

  // Standalone Dev Preview Studio: lets developer/user toggle Popup vs Side Panel vs Fullscreen
  return (
    <div className="flex min-h-screen flex-col items-center justify-start px-4 py-6">
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-2 text-xs"
        style={{
          width: 'min(100%, 760px)',
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/icon-32.png"
            alt="Pinpoint"
            className="h-6 w-6 rounded-md"
          />
          <div>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {BRAND.name}
            </span>
            <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
              Extension Interactive Preview ({BRAND.shortcutMac})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewViewport('popup')}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors"
            style={{
              backgroundColor:
                previewViewport === 'popup' ? 'var(--bg-chip-active)' : 'transparent',
              borderColor:
                previewViewport === 'popup'
                  ? 'var(--bg-selected-border)'
                  : 'transparent',
              color:
                previewViewport === 'popup'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
            }}
          >
            <AppWindow className="h-3.5 w-3.5" />
            Popup (580×590)
          </button>

          <button
            type="button"
            onClick={() => setPreviewViewport('sidepanel')}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors"
            style={{
              backgroundColor:
                previewViewport === 'sidepanel'
                  ? 'var(--bg-chip-active)'
                  : 'transparent',
              borderColor:
                previewViewport === 'sidepanel'
                  ? 'var(--bg-selected-border)'
                  : 'transparent',
              color:
                previewViewport === 'sidepanel'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
            }}
          >
            <PanelRight className="h-3.5 w-3.5" />
            Side Panel (380px)
          </button>

          <button
            type="button"
            onClick={() => setPreviewViewport('full')}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-colors"
            style={{
              backgroundColor:
                previewViewport === 'full' ? 'var(--bg-chip-active)' : 'transparent',
              borderColor:
                previewViewport === 'full'
                  ? 'var(--bg-selected-border)'
                  : 'transparent',
              color:
                previewViewport === 'full'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Expanded
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border transition-all duration-200"
        style={{
          width:
            previewViewport === 'popup'
              ? '580px'
              : previewViewport === 'sidepanel'
                ? '380px'
                : 'min(100%, 820px)',
          height:
            previewViewport === 'popup'
              ? '590px'
              : previewViewport === 'sidepanel'
                ? '720px'
                : '720px',
          maxWidth: '100%',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        {corePanel}
      </div>
    </div>
  );
};
