import type {
  BrowserCapabilities,
  RawBookmarkNode,
  RawBrowserSnapshot,
  RawHistoryOrSessionItem,
  RawOpenTab,
  RawReadingListItem,
  RawTabGroup,
  UndoRestorationStep,
  UndoSnapshot,
  UserPreferences,
} from '../types';
import { isBookmarkletUrl } from '../engine/urlUtils';
import { buildMockSnapshot, createInitialMockData } from './mockData';

const PREFS_STORAGE_KEY = 'pinpoint_user_preferences_v1';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultFilter: 'all',
  preferSwitchToOpenTab: true,
  compactDensity: false,
  recentSearches: [],
};

// Detect Chrome / Firefox WebExtension runtime safely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getExtApi(): typeof chrome | undefined {
  const g = globalThis as unknown as {
    chrome?: typeof chrome;
    browser?: typeof chrome;
  };
  if (g.chrome && g.chrome.bookmarks) return g.chrome;
  if (g.browser && g.browser.bookmarks) return g.browser;
  return undefined;
}

// Stateful mock workspace for standalone browser preview & automated UI tests
const mockState = createInitialMockData();
let mockHistoryPermissionGranted = false;
let mockNextIdCounter = 9000;
const mockListeners = new Set<() => void>();

function notifyMockListeners() {
  for (const listener of mockListeners) {
    listener();
  }
}

function findMockBookmarkNode(
  nodes: RawBookmarkNode[],
  targetId: string,
  parent: RawBookmarkNode | null = null
): { node: RawBookmarkNode; parent: RawBookmarkNode | null; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i];
    if (current.id === targetId) {
      return { node: current, parent, index: i };
    }
    if (current.children) {
      const found = findMockBookmarkNode(current.children, targetId, current);
      if (found) return found;
    }
  }
  return null;
}

export function getBrowserCapabilities(): BrowserCapabilities {
  const ext = getExtApi();
  if (!ext) {
    return {
      isExtension: false,
      browserName: 'preview',
      supportsTabGroups: true,
      supportsReadingList: true,
      supportsSidePanel: true,
      supportsOptionalHistory: true,
      supportsFaviconApi: false,
    };
  }

  const runtimeUrl = ext.runtime?.getURL ? ext.runtime.getURL('') : '';
  const isFirefox =
    runtimeUrl.startsWith('moz-extension://') ||
    (typeof navigator !== 'undefined' && /Firefox\//i.test(navigator.userAgent));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExt = ext as any;

  return {
    isExtension: true,
    browserName: isFirefox ? 'firefox' : 'chrome',
    supportsTabGroups: Boolean(anyExt.tabGroups?.query),
    supportsReadingList: Boolean(anyExt.readingList?.query),
    supportsSidePanel: Boolean(anyExt.sidePanel?.open || anyExt.sidebarAction?.open),
    supportsOptionalHistory: Boolean(anyExt.permissions?.request || anyExt.history?.search),
    supportsFaviconApi: !isFirefox && Boolean(ext.runtime?.getURL),
  };
}

export function getFaviconUrl(pageUrl: string, fallbackFavIconUrl?: string): string | undefined {
  if (!pageUrl || isBookmarkletUrl(pageUrl)) return undefined;
  if (
    fallbackFavIconUrl &&
    (fallbackFavIconUrl.startsWith('http://') ||
      fallbackFavIconUrl.startsWith('https://') ||
      fallbackFavIconUrl.startsWith('data:'))
  ) {
    return fallbackFavIconUrl;
  }

  const caps = getBrowserCapabilities();
  const ext = getExtApi();
  if (caps.supportsFaviconApi && ext?.runtime?.getURL) {
    const faviconUrl = new URL(ext.runtime.getURL('/_favicon/'));
    faviconUrl.searchParams.set('pageUrl', pageUrl);
    faviconUrl.searchParams.set('size', '32');
    return faviconUrl.toString();
  }
  return undefined;
}

async function checkHistoryPermission(ext: typeof chrome): Promise<boolean> {
  try {
    if (typeof ext.history?.search === 'function') {
      return true;
    }
    if (typeof ext.permissions?.contains === 'function') {
      return await ext.permissions.contains({ permissions: ['history'] });
    }
    return false;
  } catch {
    return false;
  }
}

export async function requestHistoryAndSessionsPermission(): Promise<boolean> {
  const ext = getExtApi();
  if (!ext) {
    mockHistoryPermissionGranted = true;
    notifyMockListeners();
    return true;
  }

  if (!ext.permissions?.request) {
    return Boolean(ext.history?.search);
  }

  try {
    const grantedBoth = await ext.permissions.request({
      permissions: ['history', 'sessions'],
    });
    if (grantedBoth) return true;
  } catch {
    // Fallback for browsers where 'sessions' is not supported in optional_permissions
  }

  try {
    return await ext.permissions.request({
      permissions: ['history'],
    });
  } catch {
    return false;
  }
}

export async function fetchBrowserSnapshot(): Promise<RawBrowserSnapshot> {
  const ext = getExtApi();
  if (!ext) {
    return buildMockSnapshot(mockState, mockHistoryPermissionGranted);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExt = ext as any;

  const [bookmarkRes, tabsRes, groupsRes, readingRes, hasHistoryPerm] = await Promise.all([
    ext.bookmarks.getTree().catch(() => [] as RawBookmarkNode[]),
    ext.tabs?.query ? ext.tabs.query({}).catch(() => []) : Promise.resolve([]),
    anyExt.tabGroups?.query ? anyExt.tabGroups.query({}).catch(() => []) : Promise.resolve([]),
    anyExt.readingList?.query ? anyExt.readingList.query({}).catch(() => []) : Promise.resolve([]),
    checkHistoryPermission(ext),
  ]);

  const openTabs: RawOpenTab[] = (tabsRes as chrome.tabs.Tab[])
    .filter((t) => typeof t.id === 'number' && Boolean(t.url))
    .map((t) => ({
      id: t.id as number,
      windowId: t.windowId ?? 1,
      index: t.index ?? 0,
      title: t.title ?? '',
      url: t.url ?? '',
      favIconUrl: t.favIconUrl,
      pinned: Boolean(t.pinned),
      active: Boolean(t.active),
      audible: Boolean(t.audible),
      groupId: typeof t.groupId === 'number' ? t.groupId : -1,
      lastAccessed: (t as unknown as { lastAccessed?: number }).lastAccessed,
    }));

  const tabGroups: RawTabGroup[] = (groupsRes as chrome.tabGroups.TabGroup[]).map((g) => ({
    id: g.id,
    title: g.title,
    color: g.color,
    collapsed: Boolean(g.collapsed),
    windowId: g.windowId,
  }));

  const readingList: RawReadingListItem[] = (readingRes as RawReadingListItem[]).map((item) => ({
    title: item.title ?? '',
    url: item.url ?? '',
    hasBeenRead: Boolean(item.hasBeenRead),
    creationTime: item.creationTime ?? 0,
    lastUpdateTime: item.lastUpdateTime ?? item.creationTime ?? 0,
  }));

  const historyAndSessions: RawHistoryOrSessionItem[] = [];
  if (hasHistoryPerm) {
    const [sessionsList, historyList] = await Promise.all([
      ext.sessions?.getRecentlyClosed
        ? ext.sessions.getRecentlyClosed({ maxResults: 25 }).catch(() => [])
        : Promise.resolve([]),
      ext.history?.search
        ? ext.history
            .search({
              text: '',
              maxResults: 250,
              startTime: Date.now() - 30 * 24 * 3600 * 1000,
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const seenClosedUrls = new Set<string>();
    for (const sess of sessionsList) {
      if (sess.tab?.url) {
        seenClosedUrls.add(sess.tab.url);
        historyAndSessions.push({
          id: sess.tab.sessionId ?? `closed-${sess.lastModified}-${historyAndSessions.length}`,
          kind: 'closed_tab',
          title: sess.tab.title ?? sess.tab.url,
          url: sess.tab.url,
          lastVisitTime: (sess.lastModified ?? 0) * 1000 || Date.now(),
          sessionId: sess.tab.sessionId,
          windowId: sess.tab.windowId,
        });
      } else if (sess.window?.tabs) {
        for (const wTab of sess.window.tabs) {
          if (!wTab.url) continue;
          seenClosedUrls.add(wTab.url);
          historyAndSessions.push({
            id: wTab.sessionId ?? `closed-win-${sess.lastModified}-${historyAndSessions.length}`,
            kind: 'closed_tab',
            title: wTab.title ?? wTab.url,
            url: wTab.url,
            lastVisitTime: (sess.lastModified ?? 0) * 1000 || Date.now(),
            sessionId: wTab.sessionId,
            windowId: sess.window.id,
          });
        }
      }
    }

    for (const h of historyList) {
      if (!h.url || seenClosedUrls.has(h.url)) continue;
      historyAndSessions.push({
        id: h.id ?? h.url,
        kind: 'history',
        title: h.title ?? h.url,
        url: h.url,
        lastVisitTime: h.lastVisitTime ?? 0,
        visitCount: h.visitCount,
      });
    }
  }

  return {
    bookmarkTree: bookmarkRes as RawBookmarkNode[],
    openTabs,
    tabGroups,
    readingList,
    historyAndSessions,
    hasHistoryPermission: hasHistoryPerm,
  };
}

export async function activateOpenTab(
  tabId: number,
  windowId?: number,
  options?: { closePopup?: boolean }
): Promise<void> {
  const ext = getExtApi();
  if (!ext) {
    for (const t of mockState.openTabs) {
      if (windowId === undefined || t.windowId === windowId) {
        t.active = t.id === tabId;
      }
    }
    const target = mockState.openTabs.find((t) => t.id === tabId);
    if (target) target.lastAccessed = Date.now();
    notifyMockListeners();
    return;
  }

  try {
    // Delegate to service worker as backup in case popup closes mid-flight
    ext.runtime?.sendMessage?.({
      type: 'PINPOINT_ACTIVATE_TAB',
      tabId,
      windowId,
    }).catch(() => {});

    await ext.tabs.update(tabId, { active: true });
    if (typeof windowId === 'number' && ext.windows?.update) {
      await ext.windows.update(windowId, { focused: true });
    }
    if (options?.closePopup && document.documentElement.dataset.surface === 'popup') {
      window.close();
    }
  } catch {
    // Tab may have been closed right before click
  }
}

export async function openItemUrl(
  url: string,
  options?: { newBackgroundTab?: boolean; closePopup?: boolean }
): Promise<{ status: 'opened' | 'bookmarklet' | 'empty' }> {
  if (!url) return { status: 'empty' };
  if (isBookmarkletUrl(url)) {
    return { status: 'bookmarklet' };
  }

  const active = !options?.newBackgroundTab;
  const ext = getExtApi();
  if (!ext) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return { status: 'opened' };
  }

  await ext.tabs.create({ url, active });
  if (active && options?.closePopup && document.documentElement.dataset.surface === 'popup') {
    window.close();
  }
  return { status: 'opened' };
}

export async function openFolderInNativeManager(folderId: string): Promise<void> {
  const caps = getBrowserCapabilities();
  const ext = getExtApi();
  if (!ext) return;

  if (caps.browserName === 'chrome') {
    await ext.tabs.create({
      url: `chrome://bookmarks/?id=${encodeURIComponent(folderId)}`,
      active: true,
    });
  }
}

export async function openInSidePanel(): Promise<boolean> {
  const ext = getExtApi();
  if (!ext) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExt = ext as any;

  try {
    if (anyExt.sidePanel?.open) {
      const currentWindow = await ext.windows.getCurrent();
      if (typeof currentWindow.id === 'number') {
        await anyExt.sidePanel.open({ windowId: currentWindow.id });
        if (document.documentElement.dataset.surface === 'popup') {
          window.close();
        }
        return true;
      }
    }
    if (anyExt.sidebarAction?.open) {
      await anyExt.sidebarAction.open();
      if (document.documentElement.dataset.surface === 'popup') {
        window.close();
      }
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function updateBookmarkDetails(
  bookmarkId: string,
  changes: { title: string; url?: string }
): Promise<void> {
  const ext = getExtApi();
  if (!ext) {
    const found = findMockBookmarkNode(mockState.bookmarkTree, bookmarkId);
    if (found) {
      found.node.title = changes.title;
      if (changes.url !== undefined && found.node.url !== undefined) {
        found.node.url = changes.url;
      }
      notifyMockListeners();
    }
    return;
  }

  await ext.bookmarks.update(bookmarkId, {
    title: changes.title,
    ...(changes.url !== undefined ? { url: changes.url } : {}),
  });
}

export async function moveBookmarkToFolder(
  bookmarkId: string,
  destinationFolderId: string
): Promise<UndoSnapshot | null> {
  const ext = getExtApi();
  if (!ext) {
    const found = findMockBookmarkNode(mockState.bookmarkTree, bookmarkId);
    const dest = findMockBookmarkNode(mockState.bookmarkTree, destinationFolderId);
    if (!found || !found.parent?.children || !dest) return null;

    const prevParentId = found.parent.id;
    const prevIndex = found.index;
    if (prevParentId === destinationFolderId) return null;

    found.parent.children.splice(found.index, 1);
    found.node.parentId = destinationFolderId;
    dest.node.children = dest.node.children ?? [];
    found.node.index = dest.node.children.length;
    dest.node.children.push(found.node);
    notifyMockListeners();

    return {
      id: `undo-move-${Date.now()}`,
      label: `Moved "${found.node.title}"`,
      steps: [
        {
          type: 'move_bookmark',
          bookmarkId,
          parentId: prevParentId,
          index: prevIndex,
        },
      ],
    };
  }

  const [existing] = await ext.bookmarks.get(bookmarkId);
  if (!existing || existing.parentId === destinationFolderId) return null;

  await ext.bookmarks.move(bookmarkId, { parentId: destinationFolderId });

  return {
    id: `undo-move-${Date.now()}`,
    label: `Moved "${existing.title || 'Bookmark'}"`,
    steps: [
      {
        type: 'move_bookmark',
        bookmarkId,
        parentId: existing.parentId ?? '1',
        index: existing.index,
      },
    ],
  };
}

export async function createBookmarkSubfolder(
  parentFolderId: string,
  folderTitle: string
): Promise<string> {
  const cleanTitle = folderTitle.trim();
  if (!cleanTitle) throw new Error('Folder name cannot be empty');

  const ext = getExtApi();
  if (!ext) {
    const parentFound = findMockBookmarkNode(mockState.bookmarkTree, parentFolderId);
    const newId = `f-custom-${++mockNextIdCounter}`;
    if (parentFound) {
      parentFound.node.children = parentFound.node.children ?? [];
      parentFound.node.children.push({
        id: newId,
        parentId: parentFolderId,
        index: parentFound.node.children.length,
        title: cleanTitle,
        dateAdded: Date.now(),
        children: [],
      });
      notifyMockListeners();
    }
    return newId;
  }

  const created = await ext.bookmarks.create({
    parentId: parentFolderId,
    title: cleanTitle,
  });
  return created.id;
}

export async function deleteBookmarksWithUndo(
  bookmarkIds: string[],
  summaryLabel?: string
): Promise<UndoSnapshot | null> {
  if (bookmarkIds.length === 0) return null;
  const ext = getExtApi();
  const steps: UndoRestorationStep[] = [];

  if (!ext) {
    let firstTitle = 'bookmark';
    for (const id of bookmarkIds) {
      const found = findMockBookmarkNode(mockState.bookmarkTree, id);
      if (found && found.parent?.children && found.node.url) {
        if (steps.length === 0) firstTitle = found.node.title;
        steps.push({
          type: 'recreate_bookmark',
          parentId: found.parent.id,
          index: found.index,
          title: found.node.title,
          url: found.node.url,
        });
        found.parent.children.splice(found.index, 1);
      }
    }
    if (steps.length === 0) return null;
    notifyMockListeners();
    return {
      id: `undo-del-${Date.now()}`,
      label:
        summaryLabel ??
        (steps.length === 1
          ? `Deleted "${firstTitle}"`
          : `Removed ${steps.length} duplicate bookmarks`),
      steps,
    };
  }

  let firstTitle = 'bookmark';
  for (const id of bookmarkIds) {
    try {
      const [node] = await ext.bookmarks.get(id);
      if (node && node.url) {
        if (steps.length === 0) firstTitle = node.title || 'bookmark';
        steps.push({
          type: 'recreate_bookmark',
          parentId: node.parentId ?? '1',
          index: node.index,
          title: node.title,
          url: node.url,
        });
        await ext.bookmarks.remove(id);
      }
    } catch {
      // Ignore already-removed bookmark
    }
  }

  if (steps.length === 0) return null;
  return {
    id: `undo-del-${Date.now()}`,
    label:
      summaryLabel ??
      (steps.length === 1
        ? `Deleted "${firstTitle}"`
        : `Removed ${steps.length} duplicate bookmarks`),
    steps,
  };
}

export async function applyUndoSnapshot(snapshot: UndoSnapshot): Promise<void> {
  const ext = getExtApi();
  if (!ext) {
    for (const step of [...snapshot.steps].reverse()) {
      if (step.type === 'recreate_bookmark') {
        const parentFound = findMockBookmarkNode(mockState.bookmarkTree, step.parentId);
        if (parentFound) {
          parentFound.node.children = parentFound.node.children ?? [];
          const insertIdx = Math.min(
            step.index ?? parentFound.node.children.length,
            parentFound.node.children.length
          );
          parentFound.node.children.splice(insertIdx, 0, {
            id: `bm-restored-${++mockNextIdCounter}`,
            parentId: step.parentId,
            index: insertIdx,
            title: step.title,
            url: step.url,
            dateAdded: Date.now(),
          });
        }
      } else if (step.type === 'move_bookmark') {
        const found = findMockBookmarkNode(mockState.bookmarkTree, step.bookmarkId);
        const dest = findMockBookmarkNode(mockState.bookmarkTree, step.parentId);
        if (found && found.parent?.children && dest) {
          found.parent.children.splice(found.index, 1);
          dest.node.children = dest.node.children ?? [];
          const insertIdx = Math.min(
            step.index ?? dest.node.children.length,
            dest.node.children.length
          );
          found.node.parentId = step.parentId;
          dest.node.children.splice(insertIdx, 0, found.node);
        }
      }
    }
    notifyMockListeners();
    return;
  }

  for (const step of [...snapshot.steps].reverse()) {
    if (step.type === 'recreate_bookmark') {
      await ext.bookmarks.create({
        parentId: step.parentId,
        index: step.index,
        title: step.title,
        url: step.url,
      });
    } else if (step.type === 'move_bookmark') {
      await ext.bookmarks.move(step.bookmarkId, {
        parentId: step.parentId,
        index: step.index,
      });
    }
  }
}

export async function toggleReadingListRead(url: string, hasBeenRead: boolean): Promise<void> {
  const ext = getExtApi();
  if (!ext) {
    const item = mockState.readingList.find((r) => r.url === url);
    if (item) {
      item.hasBeenRead = hasBeenRead;
      item.lastUpdateTime = Date.now();
      notifyMockListeners();
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExt = ext as any;
  if (anyExt.readingList?.updateEntry) {
    await anyExt.readingList.updateEntry({ url, hasBeenRead });
  }
}

export async function closeBrowserTab(tabId: number): Promise<void> {
  const ext = getExtApi();
  if (!ext) {
    const idx = mockState.openTabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) {
      mockState.openTabs.splice(idx, 1);
      notifyMockListeners();
    }
    return;
  }

  await ext.tabs.remove(tabId);
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const ext = getExtApi();
  try {
    if (ext?.storage?.local) {
      const stored = await ext.storage.local.get(PREFS_STORAGE_KEY);
      if (stored && stored[PREFS_STORAGE_KEY]) {
        return { ...DEFAULT_USER_PREFERENCES, ...stored[PREFS_STORAGE_KEY] };
      }
      return DEFAULT_USER_PREFERENCES;
    }
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_USER_PREFERENCES;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const ext = getExtApi();
  try {
    if (ext?.storage?.local) {
      await ext.storage.local.set({ [PREFS_STORAGE_KEY]: prefs });
      return;
    }
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage write errors
  }
}

export function subscribeToBrowserChanges(onChanged: () => void): () => void {
  const ext = getExtApi();
  if (!ext) {
    mockListeners.add(onChanged);
    return () => {
      mockListeners.delete(onChanged);
    };
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      onChanged();
    }, 120);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyExt = ext as any;
  const eventTargets: Array<{ addListener: (fn: () => void) => void; removeListener: (fn: () => void) => void }> = [
    ext.bookmarks?.onCreated,
    ext.bookmarks?.onRemoved,
    ext.bookmarks?.onChanged,
    ext.bookmarks?.onMoved,
    ext.tabs?.onCreated,
    ext.tabs?.onRemoved,
    ext.tabs?.onUpdated,
    anyExt.tabGroups?.onCreated,
    anyExt.tabGroups?.onUpdated,
    anyExt.tabGroups?.onRemoved,
    anyExt.readingList?.onEntryAdded,
    anyExt.readingList?.onEntryRemoved,
    anyExt.readingList?.onEntryUpdated,
  ].filter(Boolean);

  for (const target of eventTargets) {
    target.addListener(debounced);
  }

  return () => {
    if (timer) clearTimeout(timer);
    for (const target of eventTargets) {
      target.removeListener(debounced);
    }
  };
}
