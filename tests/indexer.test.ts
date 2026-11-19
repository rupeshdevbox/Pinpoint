import { describe, expect, it } from 'vitest';
import { buildMockSnapshot, createInitialMockData } from '../src/adapters/mockData';
import { buildBrowserSnapshotIndex } from '../src/engine/indexer';

describe('indexer — buildBrowserSnapshotIndex', () => {
  it('computes full nested folder breadcrumbs and recursive bookmark counts', () => {
    const raw = buildMockSnapshot(createInitialMockData(), true);
    const index = buildBrowserSnapshotIndex(raw);

    const grafanaBm = index.bookmarkItems.find((b) => b.bookmarkId === 'bm-201');
    expect(grafanaBm).toBeDefined();
    expect(grafanaBm?.folderBreadcrumb).toBe('Bookmarks Bar › Engineering › Cloud & Infra');
    expect(grafanaBm?.folderPath).toEqual(['Bookmarks Bar', 'Engineering', 'Cloud & Infra']);

    const engFolder = index.foldersById.get('f-eng');
    expect(engFolder).toBeDefined();
    expect(engFolder?.bookmarkCount).toBe(0);
    expect(engFolder?.totalBookmarkCount).toBe(8);
  });

  it('cross-correlates saved bookmarks with open tabs and colored Chrome Tab Groups', () => {
    const raw = buildMockSnapshot(createInitialMockData(), false);
    const index = buildBrowserSnapshotIndex(raw);

    const linearBookmark = index.bookmarkItems.find((b) => b.bookmarkId === 'bm-101');
    expect(linearBookmark?.openTabs.length).toBe(1);
    expect(linearBookmark?.tabGroup?.title).toBe('Sprint 24');
    expect(linearBookmark?.tabGroup?.color).toBe('blue');

    // Reverse direction: open tab knows which bookmark folder it is saved in
    const linearTab = index.tabItems.find((t) => t.tabId === 1001);
    expect(linearTab?.folderBreadcrumb).toBe('Bookmarks Bar');
    expect(linearTab?.savedLocations.length).toBe(1);

    // Unnamed Chrome Tab Group receives clean fallback title while keeping exact color
    const unnamedGroup = index.tabGroupsById.get(22);
    expect(unnamedGroup?.title).toBe('Untitled Group');
    expect(unnamedGroup?.color).toBe('orange');
  });

  it('detects duplicate URLs across multiple folders even with www or utm differences', () => {
    const raw = buildMockSnapshot(createInitialMockData(), false);
    const index = buildBrowserSnapshotIndex(raw);

    // Mock dataset has React 19 (3 folders), Stripe Webhooks (2 folders), Figma (2 folders)
    expect(index.duplicateClusters.length).toBe(3);

    const reactCluster = index.duplicateClusters.find((c) => c.domain === 'react.dev');
    expect(reactCluster?.items.length).toBe(3);
  });
});
