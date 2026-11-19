import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  ArrowUpRight,
  FolderOpen,
  Layers,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import './styles/index.css';
import { buildMockSnapshot, createInitialMockData } from './adapters/mockData';
import { buildBrowserSnapshotIndex } from './engine/indexer';
import { searchSnapshot } from './engine/searchEngine';
import { SearchHeader } from './components/SearchHeader';
import { SourceFilterBar } from './components/SourceFilterBar';
import { ResultList } from './components/ResultList';
import { FolderExplorerView } from './components/FolderExplorerView';
import { BookmarkEditModal } from './components/BookmarkEditModal';
import { DuplicateFinderView } from './components/DuplicateFinderView';
import { ShortcutFooter } from './components/ShortcutFooter';

const noop = () => {};
const asyncNoop = async () => {};
const asyncStr = async () => '1';

const rawSnap = buildMockSnapshot(createInitialMockData(), true);
const fullIndex = buildBrowserSnapshotIndex(rawSnap);
const caps = {
  isExtension: true,
  browserName: 'chrome' as const,
  supportsTabGroups: true,
  supportsReadingList: true,
  supportsSidePanel: true,
  supportsOptionalHistory: true,
  supportsFaviconApi: false,
};

const StudioBackdrop: React.FC<{
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ width, height, children }) => (
  <div
    style={{
      width: `${width}px`,
      height: `${height}px`,
      background:
        'radial-gradient(circle at 14% 18%, #312e81 0%, transparent 48%), radial-gradient(circle at 88% 82%, #0f3a5d 0%, transparent 48%), linear-gradient(135deg, #07090e 0%, #0f1320 55%, #090d16 100%)',
      color: '#f8fafc',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: width >= 1200 ? '48px 64px' : '24px 28px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", "Segoe UI", sans-serif',
    }}
  >
    {/* Subtle grid pattern */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        pointerEvents: 'none',
      }}
    />
    {children}
  </div>
);

const ExtensionFrame: React.FC<{
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  children: React.ReactNode;
}> = ({ width = 580, height = 580, theme = 'dark', children }) => (
  <div
    data-theme={theme}
    style={{
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '18px',
      overflow: 'hidden',
      border:
        theme === 'dark'
          ? '1px solid rgba(255, 255, 255, 0.16)'
          : '1px solid rgba(15, 23, 42, 0.14)',
      boxShadow:
        '0 32px 72px -12px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(129, 140, 248, 0.2)',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);

function renderSlide(slide: string) {
  const dummyRef = { current: null };

  if (slide === 'shot1') {
    const results = searchSnapshot(fullIndex, '', 'all');
    return (
      <StudioBackdrop width={1280} height={800}>
        <div style={{ maxWidth: '500px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.16)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              color: '#c7d2fe',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '22px',
            }}
          >
            <img src="/icons/icon-32.png" alt="" style={{ width: 20, height: 20, borderRadius: 5 }} />
            <span>Pinpoint for Chrome • ⌘⇧K</span>
          </div>
          <h1
            style={{
              fontSize: '44px',
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 18px 0',
            }}
          >
            Find any saved URL, folder, or tab group in milliseconds.
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: '0 0 28px 0',
            }}
          >
            Every result reveals its exact Bookmark Folder breadcrumb and colored Chrome Tab Group —
            and switches straight to already-open tabs instead of creating duplicates.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FolderOpen className="h-4 w-4 text-amber-400" />
              <span>Full interactive Bookmark Folder paths on every link</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Searches Bookmarks, Open Tabs, Tab Groups &amp; Reading List</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>100% local &amp; private — zero external servers or tracking</span>
            </div>
          </div>
        </div>

        <div style={{ zIndex: 2 }}>
          <ExtensionFrame width={590} height={640} theme="dark">
            <SearchHeader
              query=""
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="dark"
              onCycleTheme={noop}
              surfaceMode="popup"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <SourceFilterBar
              activeTab="all"
              onSelectTab={noop}
              counts={fullIndex.counts}
              capabilities={caps}
              hasHistoryPermission
            />
            <ResultList
              results={results}
              selectedIndex={0}
              onSelectIndex={noop}
              activeTab="all"
              query=""
              onClearQuery={noop}
              hasHistoryPermission
              onGrantHistoryPermission={noop}
              resolvedTheme="dark"
              onPrimaryAction={noop}
              onSwitchToTab={noop}
              onRevealExplorer={noop}
              onCopyUrl={noop}
              onEditBookmark={noop}
              onDeleteBookmark={noop}
              onToggleReadingList={noop}
              onCloseTab={noop}
              onOpenDuplicatesView={noop}
            />
            <ShortcutFooter resultCount={results.length} surfaceMode="popup" explorerOpen={false} />
          </ExtensionFrame>
        </div>
      </StudioBackdrop>
    );
  }

  if (slide === 'shot2') {
    return (
      <StudioBackdrop width={1280} height={800}>
        <div style={{ maxWidth: '490px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(251, 191, 36, 0.14)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#fde68a',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '22px',
            }}
          >
            <MapPin className="h-4 w-4" />
            <span>Reveal in Folder Explorer</span>
          </div>
          <h1
            style={{
              fontSize: '42px',
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 18px 0',
            }}
          >
            Never ask “Which folder did I save that in?” again.
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Click any breadcrumb trail or press ⌘⇧L to inspect the exact containing folder or
            Chrome Tab Group with your matched bookmark highlighted right in context.
          </p>
        </div>

        <div style={{ zIndex: 2 }}>
          <ExtensionFrame width={590} height={620} theme="dark">
            <SearchHeader
              query="cloud grafana"
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="dark"
              onCycleTheme={noop}
              surfaceMode="popup"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <FolderExplorerView
              target={{
                type: 'folder',
                folderId: 'f-cloud',
                highlightBookmarkId: 'bm-201',
              }}
              index={fullIndex}
              resolvedTheme="dark"
              browserName="chrome"
              onNavigateTarget={noop}
              onClose={noop}
              onPrimaryAction={noop}
              onSwitchToTab={noop}
              onCopyUrl={noop}
              onEditBookmark={noop}
              onDeleteBookmark={noop}
              onCloseTab={noop}
              onOpenNativeBookmarkManager={noop}
            />
            <ShortcutFooter resultCount={3} surfaceMode="popup" explorerOpen />
          </ExtensionFrame>
        </div>
      </StudioBackdrop>
    );
  }

  if (slide === 'shot3') {
    const results = searchSnapshot(fullIndex, 'stripe', 'all');
    const targetBm = fullIndex.bookmarkItems.find((b) => b.bookmarkId === 'bm-302') ?? null;
    return (
      <StudioBackdrop width={1280} height={800}>
        <div style={{ maxWidth: '490px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(52, 211, 153, 0.14)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#a7f3d0',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '22px',
            }}
          >
            <Zap className="h-4 w-4" />
            <span>Instant Folder Organization</span>
          </div>
          <h1
            style={{
              fontSize: '42px',
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 18px 0',
            }}
          >
            Rename, move folders &amp; create subfolders on the fly.
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Filter destination folders by typing a few characters, create new subfolders inline,
            and undo accidental moves or deletions with one click.
          </p>
        </div>

        <div style={{ zIndex: 2 }}>
          <ExtensionFrame width={590} height={630} theme="dark">
            <SearchHeader
              query="stripe"
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="dark"
              onCycleTheme={noop}
              surfaceMode="popup"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <SourceFilterBar
              activeTab="all"
              onSelectTab={noop}
              counts={fullIndex.counts}
              capabilities={caps}
              hasHistoryPermission
            />
            <ResultList
              results={results}
              selectedIndex={0}
              onSelectIndex={noop}
              activeTab="all"
              query="stripe"
              onClearQuery={noop}
              hasHistoryPermission
              onGrantHistoryPermission={noop}
              resolvedTheme="dark"
              onPrimaryAction={noop}
              onSwitchToTab={noop}
              onRevealExplorer={noop}
              onCopyUrl={noop}
              onEditBookmark={noop}
              onDeleteBookmark={noop}
              onToggleReadingList={noop}
              onCloseTab={noop}
              onOpenDuplicatesView={noop}
            />
            <ShortcutFooter resultCount={results.length} surfaceMode="popup" explorerOpen={false} />
            <BookmarkEditModal
              bookmark={targetBm}
              folders={fullIndex.folderList}
              onClose={noop}
              onSave={asyncNoop}
              onCreateSubfolder={asyncStr}
              onDelete={noop}
            />
          </ExtensionFrame>
        </div>
      </StudioBackdrop>
    );
  }

  if (slide === 'shot4') {
    return (
      <StudioBackdrop width={1280} height={800}>
        <div style={{ maxWidth: '490px', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(251, 146, 60, 0.14)',
              border: '1px solid rgba(251, 146, 60, 0.35)',
              color: '#fed7aa',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '22px',
            }}
          >
            <Sparkles className="h-4 w-4" />
            <span>Smart Duplicate Detector</span>
          </div>
          <h1
            style={{
              fontSize: '42px',
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 18px 0',
            }}
          >
            Spot &amp; clean up duplicate bookmarks across folders.
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.55,
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Automatically normalizes tracking parameters and www prefixes to group redundant copies,
            showing every folder location with safe Undo protection.
          </p>
        </div>

        <div style={{ zIndex: 2 }}>
          <ExtensionFrame width={590} height={630} theme="dark">
            <SearchHeader
              query=""
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="dark"
              onCycleTheme={noop}
              surfaceMode="popup"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <SourceFilterBar
              activeTab="duplicates"
              onSelectTab={noop}
              counts={fullIndex.counts}
              capabilities={caps}
              hasHistoryPermission
            />
            <DuplicateFinderView
              clusters={fullIndex.duplicateClusters}
              query=""
              onRevealExplorer={noop}
              onKeepOnlyCopy={noop}
              onCleanAllDuplicates={noop}
              onDeleteBookmark={noop}
              onPrimaryAction={noop}
              onSwitchToTab={noop}
            />
            <ShortcutFooter
              resultCount={fullIndex.duplicateClusters.length}
              surfaceMode="popup"
              explorerOpen={false}
            />
          </ExtensionFrame>
        </div>
      </StudioBackdrop>
    );
  }

  if (slide === 'shot5') {
    const lightResults = searchSnapshot(fullIndex, 'in:Engineering', 'all');
    const sideResults = searchSnapshot(fullIndex, '', 'tabs');
    return (
      <StudioBackdrop width={1280} height={800}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', zIndex: 2, width: '100%', justifyContent: 'center' }}>
          <ExtensionFrame width={570} height={640} theme="light">
            <SearchHeader
              query="in:Engineering"
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="light"
              onCycleTheme={noop}
              surfaceMode="popup"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <SourceFilterBar
              activeTab="all"
              onSelectTab={noop}
              counts={fullIndex.counts}
              capabilities={caps}
              hasHistoryPermission
            />
            <ResultList
              results={lightResults}
              selectedIndex={0}
              onSelectIndex={noop}
              activeTab="all"
              query="in:Engineering"
              onClearQuery={noop}
              hasHistoryPermission
              onGrantHistoryPermission={noop}
              resolvedTheme="light"
              onPrimaryAction={noop}
              onSwitchToTab={noop}
              onRevealExplorer={noop}
              onCopyUrl={noop}
              onEditBookmark={noop}
              onDeleteBookmark={noop}
              onToggleReadingList={noop}
              onCloseTab={noop}
              onOpenDuplicatesView={noop}
            />
            <ShortcutFooter
              resultCount={lightResults.length}
              surfaceMode="popup"
              explorerOpen={false}
            />
          </ExtensionFrame>

          <ExtensionFrame width={390} height={640} theme="dark">
            <SearchHeader
              query=""
              onQueryChange={noop}
              inputRef={dummyRef}
              theme="dark"
              onCycleTheme={noop}
              surfaceMode="sidepanel"
              supportsSidePanel
              onOpenSidePanel={noop}
              preferSwitchToOpenTab
              onTogglePreferSwitchToOpenTab={noop}
            />
            <SourceFilterBar
              activeTab="tabs"
              onSelectTab={noop}
              counts={fullIndex.counts}
              capabilities={caps}
              hasHistoryPermission
            />
            <ResultList
              results={sideResults}
              selectedIndex={0}
              onSelectIndex={noop}
              activeTab="tabs"
              query=""
              onClearQuery={noop}
              hasHistoryPermission
              onGrantHistoryPermission={noop}
              resolvedTheme="dark"
              onPrimaryAction={noop}
              onSwitchToTab={noop}
              onRevealExplorer={noop}
              onCopyUrl={noop}
              onEditBookmark={noop}
              onDeleteBookmark={noop}
              onToggleReadingList={noop}
              onCloseTab={noop}
              onOpenDuplicatesView={noop}
            />
            <ShortcutFooter
              resultCount={sideResults.length}
              surfaceMode="sidepanel"
              explorerOpen={false}
            />
          </ExtensionFrame>
        </div>
      </StudioBackdrop>
    );
  }

  if (slide === 'promo-small') {
    return (
      <StudioBackdrop width={440} height={280}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 2, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/icons/icon-128.png"
              alt="Pinpoint"
              style={{ width: 54, height: 54, borderRadius: 14 }}
            />
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Pinpoint
              </div>
              <div style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 600 }}>
                Bookmark, Folder &amp; Tab Group Search
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: '14px',
              background: 'rgba(20, 24, 34, 0.92)',
              border: '1px solid rgba(129, 140, 248, 0.32)',
              padding: '12px 14px',
              boxShadow: '0 16px 32px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#cbd5e1', fontSize: '12.5px' }}>
              <Search className="h-4 w-4 text-indigo-400" />
              <span>stripe webhooks</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>⌘⇧K</span>
            </div>
            <div
              style={{
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.14)',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                padding: '8px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span>Stripe Webhooks Verification</span>
                <span style={{ fontSize: '10px', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ArrowUpRight className="h-3 w-3" /> Switch • W1
                </span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FolderOpen className="h-3 w-3" />
                <span>Bookmarks Bar › Engineering › Payments</span>
              </div>
            </div>
          </div>
        </div>
      </StudioBackdrop>
    );
  }

  // Default: promo-marquee (1400x560)
  const marqueeResults = searchSnapshot(fullIndex, '', 'all').slice(0, 5);
  return (
    <StudioBackdrop width={1400} height={560}>
      <div style={{ maxWidth: '580px', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <img
            src="/icons/icon-128.png"
            alt="Pinpoint"
            style={{ width: 64, height: 64, borderRadius: 16 }}
          />
          <div>
            <div style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Pinpoint
            </div>
            <div style={{ fontSize: '15px', color: '#a5b4fc', fontWeight: 600 }}>
              Instant Bookmark, Folder &amp; Chrome Tab Group Finder
            </div>
          </div>
        </div>
        <h2
          style={{
            fontSize: '38px',
            lineHeight: 1.14,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 16px 0',
          }}
        >
          Every saved link &amp; open tab — located in one shortcut.
        </h2>
        <p style={{ fontSize: '17px', lineHeight: 1.5, color: '#94a3b8', margin: 0 }}>
          See full folder breadcrumbs, colored Chrome Tab Groups, duplicate clusters, and Reading
          List items with 100% local privacy.
        </p>
      </div>

      <div style={{ zIndex: 2 }}>
        <ExtensionFrame width={600} height={460} theme="dark">
          <SearchHeader
            query=""
            onQueryChange={noop}
            inputRef={dummyRef}
            theme="dark"
            onCycleTheme={noop}
            surfaceMode="popup"
            supportsSidePanel
            onOpenSidePanel={noop}
            preferSwitchToOpenTab
            onTogglePreferSwitchToOpenTab={noop}
          />
          <SourceFilterBar
            activeTab="all"
            onSelectTab={noop}
            counts={fullIndex.counts}
            capabilities={caps}
            hasHistoryPermission
          />
          <ResultList
            results={marqueeResults}
            selectedIndex={0}
            onSelectIndex={noop}
            activeTab="all"
            query=""
            onClearQuery={noop}
            hasHistoryPermission
            onGrantHistoryPermission={noop}
            resolvedTheme="dark"
            onPrimaryAction={noop}
            onSwitchToTab={noop}
            onRevealExplorer={noop}
            onCopyUrl={noop}
            onEditBookmark={noop}
            onDeleteBookmark={noop}
            onToggleReadingList={noop}
            onCloseTab={noop}
            onOpenDuplicatesView={noop}
          />
        </ExtensionFrame>
      </div>
    </StudioBackdrop>
  );
}

const params = new URLSearchParams(window.location.search);
const slide = params.get('slide') || 'shot1';

ReactDOM.createRoot(document.getElementById('studio-root')!).render(
  <React.StrictMode>{renderSlide(slide)}</React.StrictMode>
);
