export type ChromeTabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange';

export type SourceKind =
  | 'bookmark'
  | 'tab'
  | 'reading_list'
  | 'history'
  | 'closed_tab'
  | 'folder'
  | 'tab_group';

export type FilterTabId =
  | 'all'
  | 'bookmarks'
  | 'tabs'
  | 'reading_list'
  | 'history'
  | 'folders'
  | 'duplicates';

export type ThemeMode = 'system' | 'dark' | 'light';

export type ExtensionSurfaceMode = 'popup' | 'sidepanel' | 'preview';

export interface TabGroupInfo {
  id: number;
  title: string;
  rawTitle: string;
  color: ChromeTabGroupColor;
  collapsed: boolean;
  windowId: number;
  windowNumber: number;
  tabCount: number;
}

export interface OpenTabMatch {
  tabId: number;
  windowId: number;
  windowNumber: number;
  title: string;
  url: string;
  normalizedUrl: string;
  favIconUrl?: string;
  pinned: boolean;
  active: boolean;
  audible: boolean;
  groupId: number;
  tabGroup?: TabGroupInfo;
  lastAccessed?: number;
}

export interface RawBookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: RawBookmarkNode[];
}

export interface RawOpenTab {
  id: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
  favIconUrl?: string;
  pinned: boolean;
  active: boolean;
  audible: boolean;
  groupId: number;
  lastAccessed?: number;
}

export interface RawTabGroup {
  id: number;
  title?: string;
  color: ChromeTabGroupColor;
  collapsed: boolean;
  windowId: number;
}

export interface RawReadingListItem {
  title: string;
  url: string;
  hasBeenRead: boolean;
  creationTime: number;
  lastUpdateTime: number;
}

export interface RawHistoryOrSessionItem {
  id: string;
  kind: 'history' | 'closed_tab';
  title: string;
  url: string;
  lastVisitTime: number;
  visitCount?: number;
  sessionId?: string;
  windowId?: number;
}

export interface SavedBookmarkLocation {
  bookmarkId: string;
  folderId: string;
  folderTitle: string;
  folderPath: string[];
  folderPathIds: string[];
  folderBreadcrumb: string;
  index?: number;
  dateAdded?: number;
}

export interface BookmarkFolderNode {
  id: string;
  parentId?: string;
  title: string;
  path: string[];
  pathIds: string[];
  pathString: string;
  depth: number;
  isRootContainer: boolean;
  childFolderIds: string[];
  directBookmarkIds: string[];
  bookmarkCount: number;
  totalBookmarkCount: number;
  dateAdded?: number;
}

export interface UnifiedSearchItem {
  uid: string;
  kind: SourceKind;
  title: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  displayUrl: string;

  // Bookmark metadata
  bookmarkId?: string;
  parentFolderId?: string;
  bookmarkIndex?: number;
  folderPath: string[];
  folderPathIds: string[];
  folderBreadcrumb: string;
  savedLocations: SavedBookmarkLocation[];

  // Open Tab / Tab Group metadata
  tabId?: number;
  windowId?: number;
  windowNumber?: number;
  pinned?: boolean;
  active?: boolean;
  audible?: boolean;
  tabGroup?: TabGroupInfo;
  openTabs: OpenTabMatch[];

  // Reading List metadata
  hasBeenRead?: boolean;

  // History / Closed Session metadata
  visitCount?: number;
  sessionId?: string;

  // Folder / Tab Group aggregate metadata
  folderNode?: BookmarkFolderNode;
  itemCount?: number;

  // Duplicate detection metadata
  duplicateCount: number;
  isDuplicate: boolean;

  // Timestamps & visuals
  timestamp?: number;
  favIconUrl?: string;
}

export interface DuplicateCluster {
  normalizedUrl: string;
  canonicalUrl: string;
  domain: string;
  displayUrl: string;
  title: string;
  items: UnifiedSearchItem[];
  openTabs: OpenTabMatch[];
}

export interface BrowserSnapshotIndex {
  allItems: UnifiedSearchItem[];
  bookmarkItems: UnifiedSearchItem[];
  tabItems: UnifiedSearchItem[];
  readingListItems: UnifiedSearchItem[];
  historyItems: UnifiedSearchItem[];
  folderItems: UnifiedSearchItem[];
  tabGroupItems: UnifiedSearchItem[];
  foldersById: Map<string, BookmarkFolderNode>;
  folderList: BookmarkFolderNode[];
  tabGroupsById: Map<number, TabGroupInfo>;
  duplicateClusters: DuplicateCluster[];
  counts: {
    all: number;
    bookmarks: number;
    tabs: number;
    readingList: number;
    history: number;
    folders: number;
    tabGroups: number;
    duplicates: number;
  };
}

export type HighlightRange = [number, number];

export type MatchReason =
  | 'title'
  | 'url'
  | 'domain'
  | 'folder'
  | 'tab_group'
  | 'open_tab'
  | 'duplicate'
  | 'unread';

export interface SearchResultItem {
  item: UnifiedSearchItem;
  score: number;
  titleRanges: HighlightRange[];
  urlRanges: HighlightRange[];
  locationRanges: HighlightRange[];
  matchReasons: MatchReason[];
}

export interface ParsedSearchQuery {
  raw: string;
  freeTextTerms: string[];
  rawFreeText: string;
  inFolder?: string;
  inGroup?: string;
  site?: string;
  isOpen?: boolean;
  isDuplicate?: boolean;
  isUnread?: boolean;
}

export interface BrowserCapabilities {
  isExtension: boolean;
  browserName: 'chrome' | 'firefox' | 'preview';
  supportsTabGroups: boolean;
  supportsReadingList: boolean;
  supportsSidePanel: boolean;
  supportsOptionalHistory: boolean;
  supportsFaviconApi: boolean;
}

export interface RawBrowserSnapshot {
  bookmarkTree: RawBookmarkNode[];
  openTabs: RawOpenTab[];
  tabGroups: RawTabGroup[];
  readingList: RawReadingListItem[];
  historyAndSessions: RawHistoryOrSessionItem[];
  hasHistoryPermission: boolean;
}

export type UndoRestorationStep =
  | {
      type: 'recreate_bookmark';
      parentId: string;
      index?: number;
      title: string;
      url: string;
    }
  | {
      type: 'move_bookmark';
      bookmarkId: string;
      parentId: string;
      index?: number;
    };

export interface UndoSnapshot {
  id: string;
  label: string;
  steps: UndoRestorationStep[];
}

export interface UserPreferences {
  theme: ThemeMode;
  defaultFilter: FilterTabId;
  preferSwitchToOpenTab: boolean;
  compactDensity: boolean;
  recentSearches: string[];
}

export type ExplorerTarget =
  | {
      type: 'folder';
      folderId: string;
      highlightBookmarkId?: string;
    }
  | {
      type: 'tab_group';
      groupId: number;
      highlightTabId?: number;
    };
