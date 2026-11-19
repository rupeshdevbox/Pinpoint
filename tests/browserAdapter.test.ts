import { describe, expect, it } from 'vitest';
import {
  applyUndoSnapshot,
  createBookmarkSubfolder,
  deleteBookmarksWithUndo,
  fetchBrowserSnapshot,
  moveBookmarkToFolder,
  requestHistoryAndSessionsPermission,
} from '../src/adapters/browserAdapter';
import { buildBrowserSnapshotIndex } from '../src/engine/indexer';
import { createExtensionManifest } from '../src/manifest/createManifest';

describe('browserAdapter & createExtensionManifest', () => {
  it('deletes and restores bookmarks to their exact original folder via UndoSnapshot', async () => {
    const before = buildBrowserSnapshotIndex(await fetchBrowserSnapshot());
    const target = before.bookmarkItems.find((b) => b.bookmarkId === 'bm-202');
    expect(target?.folderBreadcrumb).toBe('Bookmarks Bar › Engineering › Cloud & Infra');

    const undo = await deleteBookmarksWithUndo(['bm-202']);
    expect(undo).not.toBeNull();

    const afterDelete = buildBrowserSnapshotIndex(await fetchBrowserSnapshot());
    expect(
      afterDelete.bookmarkItems.some((b) => b.title.includes('AWS IAM Role Explorer'))
    ).toBe(false);

    await applyUndoSnapshot(undo!);
    const afterRestore = buildBrowserSnapshotIndex(await fetchBrowserSnapshot());
    const restored = afterRestore.bookmarkItems.find((b) =>
      b.title.includes('AWS IAM Role Explorer')
    );
    expect(restored).toBeDefined();
    expect(restored?.folderBreadcrumb).toBe('Bookmarks Bar › Engineering › Cloud & Infra');
  });

  it('creates a subfolder, moves a bookmark into it, and undoes the move', async () => {
    const newFolderId = await createBookmarkSubfolder('f-eng', 'Observability');
    const moveUndo = await moveBookmarkToFolder('bm-203', newFolderId);
    expect(moveUndo).not.toBeNull();

    const movedIdx = buildBrowserSnapshotIndex(await fetchBrowserSnapshot());
    const movedItem = movedIdx.bookmarkItems.find((b) => b.bookmarkId === 'bm-203');
    expect(movedItem?.folderBreadcrumb).toBe('Bookmarks Bar › Engineering › Observability');

    await applyUndoSnapshot(moveUndo!);
    const revertedIdx = buildBrowserSnapshotIndex(await fetchBrowserSnapshot());
    const revertedItem = revertedIdx.bookmarkItems.find((b) => b.bookmarkId === 'bm-203');
    expect(revertedItem?.folderBreadcrumb).toBe('Bookmarks Bar › Engineering › Cloud & Infra');
  });

  it('unlocks history and closed tabs when optional permission is granted', async () => {
    const initial = await fetchBrowserSnapshot();
    expect(initial.hasHistoryPermission).toBe(false);
    expect(initial.historyAndSessions.length).toBe(0);

    const granted = await requestHistoryAndSessionsPermission();
    expect(granted).toBe(true);

    const unlocked = await fetchBrowserSnapshot();
    expect(unlocked.hasHistoryPermission).toBe(true);
    expect(unlocked.historyAndSessions.length).toBeGreaterThan(0);
  });

  it('generates valid Chrome Web Store and Firefox Manifest V3 objects within character limits', () => {
    const chromeManifest = createExtensionManifest('chrome');
    const firefoxManifest = createExtensionManifest('firefox');

    expect(chromeManifest.manifest_version).toBe(3);
    expect((chromeManifest.name as string).length).toBeLessThanOrEqual(45);
    expect((chromeManifest.description as string).length).toBeLessThanOrEqual(132);
    expect(chromeManifest.permissions).toContain('tabGroups');
    expect(chromeManifest.optional_permissions).toEqual(['history', 'sessions']);

    expect(firefoxManifest.manifest_version).toBe(3);
    expect(firefoxManifest.permissions).not.toContain('tabGroups');
    expect(firefoxManifest.sidebar_action).toBeDefined();
  });
});
