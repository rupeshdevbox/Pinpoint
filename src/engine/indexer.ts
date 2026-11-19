import type {
  BookmarkFolderNode,
  BrowserSnapshotIndex,
  DuplicateCluster,
  OpenTabMatch,
  RawBookmarkNode,
  RawBrowserSnapshot,
  SavedBookmarkLocation,
  TabGroupInfo,
  UnifiedSearchItem,
} from '../types';
import { extractDomain, formatDisplayUrl, normalizeUrl } from './urlUtils';

const SYNTHETIC_ROOT_IDS = new Set(['0', 'root________']);

function normalizeRootFolderTitle(node: RawBookmarkNode): string {
  if (node.title && node.title.trim()) return node.title.trim();
  if (node.id === '1' || node.id === 'toolbar_____') return 'Bookmarks Bar';
  if (node.id === '2' || node.id === 'unfiled_____') return 'Other Bookmarks';
  if (node.id === '3' || node.id === 'mobile______') return 'Mobile Bookmarks';
  if (node.id === 'menu________') return 'Bookmarks Menu';
  return 'Untitled Folder';
}

export function buildBrowserSnapshotIndex(snapshot: RawBrowserSnapshot): BrowserSnapshotIndex {
  // 1. Assign stable 1-based window numbers across open tabs and tab groups
  const windowNumberMap = new Map<number, number>();
  let nextWinNum = 1;
  for (const tab of snapshot.openTabs) {
    if (!windowNumberMap.has(tab.windowId)) {
      windowNumberMap.set(tab.windowId, nextWinNum++);
    }
  }
  for (const group of snapshot.tabGroups) {
    if (!windowNumberMap.has(group.windowId)) {
      windowNumberMap.set(group.windowId, nextWinNum++);
    }
  }

  // 2. Index Chrome Tab Groups
  const tabCountByGroupId = new Map<number, number>();
  for (const tab of snapshot.openTabs) {
    if (tab.groupId !== undefined && tab.groupId >= 0) {
      tabCountByGroupId.set(tab.groupId, (tabCountByGroupId.get(tab.groupId) ?? 0) + 1);
    }
  }

  const tabGroupsById = new Map<number, TabGroupInfo>();
  for (const rawGroup of snapshot.tabGroups) {
    const rawTitle = (rawGroup.title ?? '').trim();
    const title = rawTitle || 'Untitled Group';
    tabGroupsById.set(rawGroup.id, {
      id: rawGroup.id,
      title,
      rawTitle,
      color: rawGroup.color ?? 'grey',
      collapsed: Boolean(rawGroup.collapsed),
      windowId: rawGroup.windowId,
      windowNumber: windowNumberMap.get(rawGroup.windowId) ?? 1,
      tabCount: tabCountByGroupId.get(rawGroup.id) ?? 0,
    });
  }

  // Synthesize fallback TabGroupInfo if an open tab references a groupId not returned by tabGroups.query
  for (const [groupId, count] of tabCountByGroupId.entries()) {
    if (!tabGroupsById.has(groupId)) {
      const sampleTab = snapshot.openTabs.find((t) => t.groupId === groupId);
      const winId = sampleTab?.windowId ?? 1;
      tabGroupsById.set(groupId, {
        id: groupId,
        title: 'Untitled Group',
        rawTitle: '',
        color: 'grey',
        collapsed: false,
        windowId: winId,
        windowNumber: windowNumberMap.get(winId) ?? 1,
        tabCount: count,
      });
    }
  }

  // 3. Build OpenTabMatch records and normalizedUrl -> OpenTabMatch[] map
  const openTabsByNormalizedUrl = new Map<string, OpenTabMatch[]>();
  const rawOpenTabMatches: OpenTabMatch[] = [];

  for (const tab of snapshot.openTabs) {
    if (!tab.url) continue;
    const normalizedUrl = normalizeUrl(tab.url);
    const tabGroup = tab.groupId >= 0 ? tabGroupsById.get(tab.groupId) : undefined;
    const match: OpenTabMatch = {
      tabId: tab.id,
      windowId: tab.windowId,
      windowNumber: windowNumberMap.get(tab.windowId) ?? 1,
      title: tab.title?.trim() || formatDisplayUrl(tab.url) || 'Untitled Tab',
      url: tab.url,
      normalizedUrl,
      favIconUrl: tab.favIconUrl,
      pinned: Boolean(tab.pinned),
      active: Boolean(tab.active),
      audible: Boolean(tab.audible),
      groupId: tab.groupId ?? -1,
      tabGroup,
      lastAccessed: tab.lastAccessed,
    };
    rawOpenTabMatches.push(match);
    if (normalizedUrl) {
      const existing = openTabsByNormalizedUrl.get(normalizedUrl);
      if (existing) {
        existing.push(match);
      } else {
        openTabsByNormalizedUrl.set(normalizedUrl, [match]);
      }
    }
  }

  // 4. Traverse Bookmark Tree -> Folder map + raw bookmark entries
  const foldersById = new Map<string, BookmarkFolderNode>();
  const folderList: BookmarkFolderNode[] = [];
  const savedLocationsByNormalizedUrl = new Map<string, SavedBookmarkLocation[]>();

  interface PendingBookmark {
    node: RawBookmarkNode;
    normalizedUrl: string;
    folderPath: string[];
    folderPathIds: string[];
    folderBreadcrumb: string;
    parentFolderId: string;
  }
  const pendingBookmarks: PendingBookmark[] = [];

  function walkNode(
    node: RawBookmarkNode,
    ancestorTitles: string[],
    ancestorIds: string[],
    depth: number
  ): number {
    const isSyntheticRoot =
      SYNTHETIC_ROOT_IDS.has(node.id) || (depth === 0 && !node.url && !node.title);

    if (isSyntheticRoot) {
      let sum = 0;
      for (const child of node.children ?? []) {
        sum += walkNode(child, [], [], depth + 1);
      }
      return sum;
    }

    // Folder node (no URL)
    if (!node.url) {
      const folderTitle =
        ancestorIds.length === 0
          ? normalizeRootFolderTitle(node)
          : node.title?.trim() || 'Untitled Folder';
      const currentPath = [...ancestorTitles, folderTitle];
      const currentPathIds = [...ancestorIds, node.id];
      const pathString = currentPath.join(' › ');
      const isRootContainer = ancestorIds.length === 0;

      const folderRecord: BookmarkFolderNode = {
        id: node.id,
        parentId: node.parentId,
        title: folderTitle,
        path: currentPath,
        pathIds: currentPathIds,
        pathString,
        depth: ancestorIds.length,
        isRootContainer,
        childFolderIds: [],
        directBookmarkIds: [],
        bookmarkCount: 0,
        totalBookmarkCount: 0,
        dateAdded: node.dateAdded,
      };

      foldersById.set(node.id, folderRecord);
      folderList.push(folderRecord);

      let recursiveBookmarks = 0;
      for (const child of node.children ?? []) {
        if (!child.url) {
          folderRecord.childFolderIds.push(child.id);
          recursiveBookmarks += walkNode(child, currentPath, currentPathIds, depth + 1);
        } else {
          folderRecord.directBookmarkIds.push(child.id);
          folderRecord.bookmarkCount += 1;
          recursiveBookmarks += 1;
          const normalizedUrl = normalizeUrl(child.url);
          pendingBookmarks.push({
            node: child,
            normalizedUrl,
            folderPath: currentPath,
            folderPathIds: currentPathIds,
            folderBreadcrumb: pathString,
            parentFolderId: node.id,
          });

          if (normalizedUrl) {
            const loc: SavedBookmarkLocation = {
              bookmarkId: child.id,
              folderId: node.id,
              folderTitle,
              folderPath: currentPath,
              folderPathIds: currentPathIds,
              folderBreadcrumb: pathString,
              index: child.index,
              dateAdded: child.dateAdded,
            };
            const list = savedLocationsByNormalizedUrl.get(normalizedUrl);
            if (list) {
              list.push(loc);
            } else {
              savedLocationsByNormalizedUrl.set(normalizedUrl, [loc]);
            }
          }
        }
      }

      folderRecord.totalBookmarkCount = recursiveBookmarks;
      return recursiveBookmarks;
    }

    // Fallback top-level bookmark directly under synthetic root
    const normalizedUrl = normalizeUrl(node.url);
    pendingBookmarks.push({
      node,
      normalizedUrl,
      folderPath: ancestorTitles,
      folderPathIds: ancestorIds,
      folderBreadcrumb: ancestorTitles.join(' › ') || 'Root',
      parentFolderId: node.parentId ?? '1',
    });
    return 1;
  }

  for (const root of snapshot.bookmarkTree) {
    walkNode(root, [], [], 0);
  }

  // 5. Materialize UnifiedSearchItems for Bookmarks with Open Tab & Duplicate correlation
  const bookmarkItems: UnifiedSearchItem[] = pendingBookmarks.map((entry) => {
    const url = entry.node.url ?? '';
    const savedLocations = entry.normalizedUrl
      ? savedLocationsByNormalizedUrl.get(entry.normalizedUrl) ?? []
      : [];
    const openTabs = entry.normalizedUrl
      ? openTabsByNormalizedUrl.get(entry.normalizedUrl) ?? []
      : [];
    const primaryOpenTab = openTabs[0];
    const duplicateCount = savedLocations.length;

    return {
      uid: `bm:${entry.node.id}`,
      kind: 'bookmark',
      title: entry.node.title?.trim() || formatDisplayUrl(url) || 'Untitled Bookmark',
      url,
      normalizedUrl: entry.normalizedUrl,
      domain: extractDomain(url),
      displayUrl: formatDisplayUrl(url),
      bookmarkId: entry.node.id,
      parentFolderId: entry.parentFolderId,
      bookmarkIndex: entry.node.index,
      folderPath: entry.folderPath,
      folderPathIds: entry.folderPathIds,
      folderBreadcrumb: entry.folderBreadcrumb,
      savedLocations,
      tabId: primaryOpenTab?.tabId,
      windowId: primaryOpenTab?.windowId,
      windowNumber: primaryOpenTab?.windowNumber,
      pinned: primaryOpenTab?.pinned,
      active: primaryOpenTab?.active,
      audible: primaryOpenTab?.audible,
      tabGroup: primaryOpenTab?.tabGroup,
      openTabs,
      duplicateCount,
      isDuplicate: duplicateCount > 1,
      timestamp: entry.node.dateAdded,
      favIconUrl: primaryOpenTab?.favIconUrl,
    };
  });

  // 6. Build DuplicateClusters
  const bookmarkItemsByNormUrl = new Map<string, UnifiedSearchItem[]>();
  for (const bm of bookmarkItems) {
    if (!bm.normalizedUrl) continue;
    const arr = bookmarkItemsByNormUrl.get(bm.normalizedUrl);
    if (arr) {
      arr.push(bm);
    } else {
      bookmarkItemsByNormUrl.set(bm.normalizedUrl, [bm]);
    }
  }

  const duplicateClusters: DuplicateCluster[] = [];
  for (const [normalizedUrl, items] of bookmarkItemsByNormUrl.entries()) {
    if (items.length > 1) {
      const first = items[0];
      duplicateClusters.push({
        normalizedUrl,
        canonicalUrl: first.url,
        domain: first.domain,
        displayUrl: first.displayUrl,
        title: first.title,
        items: [...items].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
        openTabs: openTabsByNormalizedUrl.get(normalizedUrl) ?? [],
      });
    }
  }
  duplicateClusters.sort(
    (a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title)
  );

  // 7. Materialize Open Tab items (cross-referenced with saved bookmark folders!)
  const tabItems: UnifiedSearchItem[] = rawOpenTabMatches.map((tab) => {
    const savedLocations = tab.normalizedUrl
      ? savedLocationsByNormalizedUrl.get(tab.normalizedUrl) ?? []
      : [];
    const primarySaved = savedLocations[0];
    const openTabs = tab.normalizedUrl
      ? openTabsByNormalizedUrl.get(tab.normalizedUrl) ?? [tab]
      : [tab];

    return {
      uid: `tab:${tab.tabId}`,
      kind: 'tab',
      title: tab.title,
      url: tab.url,
      normalizedUrl: tab.normalizedUrl,
      domain: extractDomain(tab.url),
      displayUrl: formatDisplayUrl(tab.url),
      bookmarkId: primarySaved?.bookmarkId,
      parentFolderId: primarySaved?.folderId,
      folderPath: primarySaved?.folderPath ?? [],
      folderPathIds: primarySaved?.folderPathIds ?? [],
      folderBreadcrumb: primarySaved?.folderBreadcrumb ?? '',
      savedLocations,
      tabId: tab.tabId,
      windowId: tab.windowId,
      windowNumber: tab.windowNumber,
      pinned: tab.pinned,
      active: tab.active,
      audible: tab.audible,
      tabGroup: tab.tabGroup,
      openTabs,
      duplicateCount: savedLocations.length,
      isDuplicate: savedLocations.length > 1,
      timestamp: tab.lastAccessed,
      favIconUrl: tab.favIconUrl,
    };
  });

  // 8. Materialize Reading List items
  const readingListItems: UnifiedSearchItem[] = snapshot.readingList.map((entry) => {
    const normalizedUrl = normalizeUrl(entry.url);
    const savedLocations = normalizedUrl
      ? savedLocationsByNormalizedUrl.get(normalizedUrl) ?? []
      : [];
    const openTabs = normalizedUrl ? openTabsByNormalizedUrl.get(normalizedUrl) ?? [] : [];
    const primarySaved = savedLocations[0];
    const primaryOpenTab = openTabs[0];

    return {
      uid: `rl:${normalizedUrl || entry.url}`,
      kind: 'reading_list',
      title: entry.title?.trim() || formatDisplayUrl(entry.url) || 'Reading List Item',
      url: entry.url,
      normalizedUrl,
      domain: extractDomain(entry.url),
      displayUrl: formatDisplayUrl(entry.url),
      bookmarkId: primarySaved?.bookmarkId,
      parentFolderId: primarySaved?.folderId,
      folderPath: primarySaved?.folderPath ?? [],
      folderPathIds: primarySaved?.folderPathIds ?? [],
      folderBreadcrumb: primarySaved?.folderBreadcrumb ?? '',
      savedLocations,
      tabId: primaryOpenTab?.tabId,
      windowId: primaryOpenTab?.windowId,
      windowNumber: primaryOpenTab?.windowNumber,
      tabGroup: primaryOpenTab?.tabGroup,
      openTabs,
      hasBeenRead: entry.hasBeenRead,
      duplicateCount: savedLocations.length,
      isDuplicate: savedLocations.length > 1,
      timestamp: entry.lastUpdateTime || entry.creationTime,
      favIconUrl: primaryOpenTab?.favIconUrl,
    };
  });

  // 9. Materialize History & Recently Closed items
  const historyItems: UnifiedSearchItem[] = snapshot.historyAndSessions.map((entry) => {
    const normalizedUrl = normalizeUrl(entry.url);
    const savedLocations = normalizedUrl
      ? savedLocationsByNormalizedUrl.get(normalizedUrl) ?? []
      : [];
    const openTabs = normalizedUrl ? openTabsByNormalizedUrl.get(normalizedUrl) ?? [] : [];
    const primarySaved = savedLocations[0];
    const primaryOpenTab = openTabs[0];

    return {
      uid: `${entry.kind}:${entry.id}`,
      kind: entry.kind,
      title: entry.title?.trim() || formatDisplayUrl(entry.url) || 'Visited Page',
      url: entry.url,
      normalizedUrl,
      domain: extractDomain(entry.url),
      displayUrl: formatDisplayUrl(entry.url),
      bookmarkId: primarySaved?.bookmarkId,
      parentFolderId: primarySaved?.folderId,
      folderPath: primarySaved?.folderPath ?? [],
      folderPathIds: primarySaved?.folderPathIds ?? [],
      folderBreadcrumb: primarySaved?.folderBreadcrumb ?? '',
      savedLocations,
      tabId: primaryOpenTab?.tabId,
      windowId: primaryOpenTab?.windowId ?? entry.windowId,
      windowNumber: primaryOpenTab?.windowNumber,
      tabGroup: primaryOpenTab?.tabGroup,
      openTabs,
      visitCount: entry.visitCount,
      sessionId: entry.sessionId,
      duplicateCount: savedLocations.length,
      isDuplicate: savedLocations.length > 1,
      timestamp: entry.lastVisitTime,
      favIconUrl: primaryOpenTab?.favIconUrl,
    };
  });

  // 10. Materialize Bookmark Folders & Chrome Tab Groups as searchable items
  const folderItems: UnifiedSearchItem[] = folderList
    .filter((f) => !f.isRootContainer || f.totalBookmarkCount > 0)
    .map((folder) => ({
      uid: `folder:${folder.id}`,
      kind: 'folder',
      title: folder.title,
      url: '',
      normalizedUrl: '',
      domain: '',
      displayUrl: `${folder.totalBookmarkCount} bookmark${folder.totalBookmarkCount === 1 ? '' : 's'}`,
      parentFolderId: folder.parentId,
      folderPath: folder.path,
      folderPathIds: folder.pathIds,
      folderBreadcrumb: folder.pathString,
      savedLocations: [],
      openTabs: [],
      folderNode: folder,
      itemCount: folder.totalBookmarkCount,
      duplicateCount: 0,
      isDuplicate: false,
      timestamp: folder.dateAdded,
    }));

  const tabGroupItems: UnifiedSearchItem[] = Array.from(tabGroupsById.values()).map((group) => ({
    uid: `group:${group.id}`,
    kind: 'tab_group',
    title: group.title,
    url: '',
    normalizedUrl: '',
    domain: '',
    displayUrl: `Window ${group.windowNumber} • ${group.tabCount} open tab${group.tabCount === 1 ? '' : 's'}`,
    folderPath: [],
    folderPathIds: [],
    folderBreadcrumb: '',
    savedLocations: [],
    windowId: group.windowId,
    windowNumber: group.windowNumber,
    tabGroup: group,
    openTabs: [],
    itemCount: group.tabCount,
    duplicateCount: 0,
    isDuplicate: false,
  }));

  // Deduplicated "All" view prioritizes: Open Tabs (not already shown on Bookmark cards),
  // Bookmarks (carrying live Open Tab & Tab Group badges), Reading List, Tab Groups, Folders, History
  const bookmarkedUrls = new Set(bookmarkItems.map((b) => b.normalizedUrl).filter(Boolean));
  const unbookmarkedTabs = tabItems.filter(
    (t) => !t.normalizedUrl || !bookmarkedUrls.has(t.normalizedUrl)
  );
  const seenUrls = new Set<string>([
    ...bookmarkedUrls,
    ...unbookmarkedTabs.map((t) => t.normalizedUrl).filter(Boolean),
  ]);
  const extraReading = readingListItems.filter(
    (r) => !r.normalizedUrl || !seenUrls.has(r.normalizedUrl)
  );
  for (const r of extraReading) {
    if (r.normalizedUrl) seenUrls.add(r.normalizedUrl);
  }
  const extraHistory = historyItems.filter(
    (h) => h.kind === 'closed_tab' || !h.normalizedUrl || !seenUrls.has(h.normalizedUrl)
  );
  const nonRootFolderItems = folderItems.filter((f) => !f.folderNode?.isRootContainer);

  const allItems: UnifiedSearchItem[] = [
    ...unbookmarkedTabs,
    ...bookmarkItems,
    ...extraReading,
    ...tabGroupItems,
    ...nonRootFolderItems,
    ...extraHistory,
  ];

  return {
    allItems,
    bookmarkItems,
    tabItems,
    readingListItems,
    historyItems,
    folderItems,
    tabGroupItems,
    foldersById,
    folderList,
    tabGroupsById,
    duplicateClusters,
    counts: {
      all: allItems.length,
      bookmarks: bookmarkItems.length,
      tabs: tabItems.length,
      readingList: readingListItems.length,
      history: historyItems.length,
      folders:
        folderList.filter((f) => !f.isRootContainer || f.totalBookmarkCount > 0).length +
        tabGroupsById.size,
      tabGroups: tabGroupsById.size,
      duplicates: duplicateClusters.length,
    },
  };
}
