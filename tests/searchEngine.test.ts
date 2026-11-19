import { describe, expect, it } from 'vitest';
import { buildMockSnapshot, createInitialMockData } from '../src/adapters/mockData';
import { buildBrowserSnapshotIndex } from '../src/engine/indexer';
import { parseSearchQuery, searchSnapshot } from '../src/engine/searchEngine';

describe('searchEngine', () => {
  const index = buildBrowserSnapshotIndex(buildMockSnapshot(createInitialMockData(), true));

  it('parses structured operators while preserving port numbers and schemes as free text', () => {
    const parsed = parseSearchQuery(
      'in:"Cloud & Infra" group:Sprint site:github.com is:open localhost:3000'
    );
    expect(parsed.inFolder).toBe('cloud & infra');
    expect(parsed.inGroup).toBe('sprint');
    expect(parsed.site).toBe('github.com');
    expect(parsed.isOpen).toBe(true);
    expect(parsed.freeTextTerms).toEqual(['localhost:3000']);
  });

  it('matches multi-token cross-field queries combining folder name and bookmark title', () => {
    const results = searchSnapshot(index, 'cloud grafana', 'bookmarks');
    expect(results.length).toBe(1);
    expect(results[0].item.bookmarkId).toBe('bm-201');
    expect(results[0].titleRanges.length).toBeGreaterThan(0);
    expect(results[0].locationRanges.length).toBeGreaterThan(0);
  });

  it('filters by Chrome Tab Group name or color using group: operator', () => {
    const sprintResults = searchSnapshot(index, 'group:sprint', 'tabs');
    expect(sprintResults.length).toBe(2);
    expect(sprintResults.every((r) => r.item.tabGroup?.title === 'Sprint 24')).toBe(true);

    const purpleResults = searchSnapshot(index, 'group:purple', 'all');
    expect(purpleResults.some((r) => r.item.domain === 'anthropic.com')).toBe(true);
  });

  it('supports is:duplicate and is:unread filters accurately', () => {
    const dupResults = searchSnapshot(index, 'is:duplicate stripe', 'all');
    expect(dupResults.length).toBe(2);
    expect(dupResults.every((r) => r.item.domain === 'docs.stripe.com')).toBe(true);

    const unreadResults = searchSnapshot(index, 'is:unread', 'reading_list');
    expect(unreadResults.length).toBe(2);
    expect(unreadResults.every((r) => r.item.hasBeenRead === false)).toBe(true);
  });
});
