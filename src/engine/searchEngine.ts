import type {
  BrowserSnapshotIndex,
  FilterTabId,
  HighlightRange,
  MatchReason,
  ParsedSearchQuery,
  SearchResultItem,
  UnifiedSearchItem,
} from '../types';

const WORD_SEP_REGEX = /[\s/\-_.:›>#?&=@]+/;

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  const parsed: ParsedSearchQuery = {
    raw,
    freeTextTerms: [],
    rawFreeText: '',
  };

  if (!trimmed) return parsed;

  // Tokenize supporting key:"quoted value" or "quoted phrase" or plain words
  const tokenRegex = /([a-zA-Z]+):"([^"]+)"|([a-zA-Z]+):(\S+)|"([^"]+)"|(\S+)/g;
  const freeTokens: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    const opKey = (match[1] ?? match[3] ?? '').toLowerCase();
    const opVal = (match[2] ?? match[4] ?? '').trim();
    const plainPhrase = (match[5] ?? match[6] ?? '').trim();

    if (opKey && opVal) {
      if (opKey === 'in' || opKey === 'folder') {
        parsed.inFolder = opVal.toLowerCase();
        continue;
      }
      if (opKey === 'group' || opKey === 'tabgroup') {
        parsed.inGroup = opVal.toLowerCase();
        continue;
      }
      if (opKey === 'site' || opKey === 'domain') {
        parsed.site = opVal.toLowerCase();
        continue;
      }
      if (opKey === 'is') {
        const flag = opVal.toLowerCase();
        if (flag === 'open' || flag === 'tab') {
          parsed.isOpen = true;
          continue;
        }
        if (flag === 'duplicate' || flag === 'dup' || flag === 'duplicates') {
          parsed.isDuplicate = true;
          continue;
        }
        if (flag === 'unread') {
          parsed.isUnread = true;
          continue;
        }
      }
      // Unrecognized operator (e.g., localhost:3000 or chrome://flags) stays searchable free text
      freeTokens.push(match[0]);
    } else if (plainPhrase) {
      freeTokens.push(plainPhrase);
    }
  }

  parsed.freeTextTerms = freeTokens.map((t) => t.toLowerCase()).filter(Boolean);
  parsed.rawFreeText = freeTokens.join(' ');
  return parsed;
}

export function mergeHighlightRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: HighlightRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push([curr[0], curr[1]]);
    }
  }
  return merged;
}

interface FieldMatchResult {
  matched: boolean;
  score: number;
  ranges: HighlightRange[];
}

function isBoundaryChar(text: string, index: number): boolean {
  if (index <= 0) return true;
  const prev = text[index - 1];
  const curr = text[index];
  if (WORD_SEP_REGEX.test(prev)) return true;
  // camelCase boundary
  if (prev >= 'a' && prev <= 'z' && curr >= 'A' && curr <= 'Z') return true;
  return false;
}

/**
 * Scores one query term against one text field using exact, prefix, word-boundary,
 * substring, and tight fuzzy-subsequence tiers, returning character highlight spans.
 */
export function matchTermInField(text: string, termLower: string): FieldMatchResult {
  if (!text || !termLower) {
    return { matched: false, score: 0, ranges: [] };
  }

  const textLower = text.toLowerCase();

  // Tier 1: Exact full match
  if (textLower === termLower) {
    return { matched: true, score: 140, ranges: [[0, text.length]] };
  }

  // Tier 2: Starts with term
  if (textLower.startsWith(termLower)) {
    return { matched: true, score: 115, ranges: [[0, termLower.length]] };
  }

  // Tier 3: Substring match (preferring word-boundary occurrence)
  let searchFrom = 0;
  let bestSubIdx = -1;
  let bestSubIsBoundary = false;
  while (searchFrom <= textLower.length - termLower.length) {
    const idx = textLower.indexOf(termLower, searchFrom);
    if (idx === -1) break;
    const boundary = isBoundaryChar(text, idx);
    if (boundary) {
      bestSubIdx = idx;
      bestSubIsBoundary = true;
      break;
    }
    if (bestSubIdx === -1) {
      bestSubIdx = idx;
    }
    searchFrom = idx + 1;
  }

  if (bestSubIdx !== -1) {
    const posPenalty = Math.min(18, Math.floor(bestSubIdx * 0.25));
    const base = bestSubIsBoundary ? 96 : 72;
    return {
      matched: true,
      score: Math.max(45, base - posPenalty),
      ranges: [[bestSubIdx, bestSubIdx + termLower.length]],
    };
  }

  // Tier 4: Fuzzy subsequence match (for terms >= 2 chars, bounded gap density so results stay crisp)
  if (termLower.length < 2 || termLower.length > textLower.length) {
    return { matched: false, score: 0, ranges: [] };
  }

  const matchedIndices: number[] = [];
  let ti = 0;
  for (let i = 0; i < textLower.length && ti < termLower.length; i++) {
    if (textLower[i] === termLower[ti]) {
      // Prefer boundary alignment if the same character appears soon at a word boundary
      matchedIndices.push(i);
      ti++;
    }
  }

  if (ti < termLower.length) {
    return { matched: false, score: 0, ranges: [] };
  }

  const spanLength = matchedIndices[matchedIndices.length - 1] - matchedIndices[0] + 1;
  // Reject overly scattered fuzzy matches across long URLs/titles
  const maxAllowedSpan = Math.max(termLower.length * 3 + 4, 14);
  if (spanLength > maxAllowedSpan) {
    return { matched: false, score: 0, ranges: [] };
  }

  let consecutiveBonus = 0;
  let boundaryBonus = 0;
  const ranges: HighlightRange[] = [];

  for (let k = 0; k < matchedIndices.length; k++) {
    const idx = matchedIndices[k];
    if (isBoundaryChar(text, idx)) {
      boundaryBonus += 6;
    }
    if (k > 0 && matchedIndices[k - 1] === idx - 1) {
      consecutiveBonus += 8;
      ranges[ranges.length - 1][1] = idx + 1;
    } else {
      ranges.push([idx, idx + 1]);
    }
  }

  const gapPenalty = (spanLength - termLower.length) * 2.5;
  const fuzzyScore = 26 + consecutiveBonus + boundaryBonus - gapPenalty;
  if (fuzzyScore < 18) {
    return { matched: false, score: 0, ranges: [] };
  }

  return {
    matched: true,
    score: Math.min(64, Math.round(fuzzyScore)),
    ranges,
  };
}

function selectPoolForTab(index: BrowserSnapshotIndex, activeTab: FilterTabId): UnifiedSearchItem[] {
  switch (activeTab) {
    case 'bookmarks':
      return index.bookmarkItems;
    case 'tabs':
      return index.tabItems;
    case 'reading_list':
      return index.readingListItems;
    case 'history':
      return index.historyItems;
    case 'folders':
      return [...index.tabGroupItems, ...index.folderItems];
    case 'duplicates':
      return index.bookmarkItems.filter((item) => item.isDuplicate);
    case 'all':
    default:
      return index.allItems;
  }
}

function getLocationLabel(item: UnifiedSearchItem): string {
  if (item.folderBreadcrumb) return item.folderBreadcrumb;
  if (item.tabGroup) return item.tabGroup.title;
  return '';
}

function passesStructuredFilters(item: UnifiedSearchItem, parsed: ParsedSearchQuery): boolean {
  if (parsed.inFolder) {
    const folderTarget = parsed.inFolder;
    const inMainFolder = item.folderBreadcrumb.toLowerCase().includes(folderTarget);
    const inSavedLocs = item.savedLocations.some((loc) =>
      loc.folderBreadcrumb.toLowerCase().includes(folderTarget)
    );
    if (!inMainFolder && !inSavedLocs) return false;
  }

  if (parsed.inGroup) {
    const groupTarget = parsed.inGroup;
    const directGroupMatch =
      item.tabGroup &&
      (item.tabGroup.title.toLowerCase().includes(groupTarget) ||
        item.tabGroup.color.toLowerCase() === groupTarget);
    const openTabGroupMatch = item.openTabs.some(
      (t) =>
        t.tabGroup &&
        (t.tabGroup.title.toLowerCase().includes(groupTarget) ||
          t.tabGroup.color.toLowerCase() === groupTarget)
    );
    if (!directGroupMatch && !openTabGroupMatch) return false;
  }

  if (parsed.site) {
    if (!item.domain.toLowerCase().includes(parsed.site)) return false;
  }

  if (parsed.isOpen) {
    if (item.kind !== 'tab' && item.kind !== 'tab_group' && item.openTabs.length === 0) {
      return false;
    }
  }

  if (parsed.isDuplicate) {
    if (!item.isDuplicate) return false;
  }

  if (parsed.isUnread) {
    if (item.kind !== 'reading_list' || item.hasBeenRead) return false;
  }

  return true;
}

function computeZeroQueryRank(item: UnifiedSearchItem, activeTab: FilterTabId): number {
  let rank = 0;
  if (activeTab === 'all') {
    if (item.kind === 'tab' && item.active) rank += 500;
    else if (item.kind === 'tab') rank += 340;
    else if (item.kind === 'bookmark' && item.openTabs.length > 0) rank += 380;
    else if (item.kind === 'bookmark') rank += 250;
    else if (item.kind === 'reading_list' && !item.hasBeenRead) rank += 230;
    else if (item.kind === 'reading_list') rank += 170;
    else if (item.kind === 'tab_group') rank += 150;
    else if (item.kind === 'folder') rank += 120;
    else if (item.kind === 'closed_tab') rank += 110;
    else rank += 80;
  } else if (activeTab === 'reading_list') {
    if (!item.hasBeenRead) rank += 200;
  } else if (activeTab === 'history') {
    if (item.kind === 'closed_tab') rank += 150;
  } else if (activeTab === 'folders') {
    if (item.kind === 'tab_group') rank += 300;
    rank += Math.min(80, item.itemCount ?? 0);
  }

  if (item.timestamp) {
    // Normalize recent timestamps into a small [0..40] tie-breaker
    rank += Math.min(40, item.timestamp / 1e11);
  }
  return rank;
}

export function searchSnapshot(
  index: BrowserSnapshotIndex,
  rawQuery: string,
  activeTab: FilterTabId,
  limit = 150
): SearchResultItem[] {
  const parsed = parseSearchQuery(rawQuery);
  const pool = selectPoolForTab(index, activeTab);

  const hasStructuredOps = Boolean(
    parsed.inFolder ||
      parsed.inGroup ||
      parsed.site ||
      parsed.isOpen ||
      parsed.isDuplicate ||
      parsed.isUnread
  );

  // Fast path: empty free-text query
  if (parsed.freeTextTerms.length === 0) {
    const filtered = hasStructuredOps
      ? pool.filter((item) => passesStructuredFilters(item, parsed))
      : pool;

    return filtered
      .map((item) => ({
        item,
        score: computeZeroQueryRank(item, activeTab),
        titleRanges: [],
        urlRanges: [],
        locationRanges: [],
        matchReasons: [
          ...(item.openTabs.length > 0 ? (['open_tab'] as MatchReason[]) : []),
          ...(item.isDuplicate ? (['duplicate'] as MatchReason[]) : []),
          ...(item.kind === 'reading_list' && !item.hasBeenRead ? (['unread'] as MatchReason[]) : []),
        ],
      }))
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, limit);
  }

  const results: SearchResultItem[] = [];

  for (const item of pool) {
    if (hasStructuredOps && !passesStructuredFilters(item, parsed)) {
      continue;
    }

    const locationText = getLocationLabel(item);
    const extraSavedPaths = item.savedLocations
      .map((l) => l.folderBreadcrumb)
      .filter((b) => b && b !== locationText)
      .join(' | ');
    const tabGroupExtra = [
      item.tabGroup?.title ?? '',
      item.tabGroup?.color ?? '',
      ...item.openTabs.map((t) => `${t.tabGroup?.title ?? ''} ${t.tabGroup?.color ?? ''}`),
    ]
      .join(' ')
      .trim();

    let allTermsMatched = true;
    let totalScore = 0;
    const titleRanges: HighlightRange[] = [];
    const urlRanges: HighlightRange[] = [];
    const locationRanges: HighlightRange[] = [];
    const reasonSet = new Set<MatchReason>();

    // Phrase bonus when multi-word query appears contiguously in title or location
    if (parsed.freeTextTerms.length > 1 && parsed.rawFreeText.length >= 4) {
      const fullPhrase = parsed.rawFreeText.toLowerCase();
      if (item.title.toLowerCase().includes(fullPhrase)) {
        totalScore += 55;
      } else if (locationText.toLowerCase().includes(fullPhrase)) {
        totalScore += 35;
      }
    }

    for (const term of parsed.freeTextTerms) {
      const titleMatch = matchTermInField(item.title, term);
      const urlMatch = matchTermInField(item.displayUrl, term);
      const domainMatch = matchTermInField(item.domain, term);
      const locMatch = matchTermInField(locationText, term);
      const altSavedMatch = extraSavedPaths
        ? matchTermInField(extraSavedPaths, term)
        : { matched: false, score: 0, ranges: [] };
      const groupMatch = tabGroupExtra
        ? matchTermInField(tabGroupExtra, term)
        : { matched: false, score: 0, ranges: [] };

      if (
        !titleMatch.matched &&
        !urlMatch.matched &&
        !domainMatch.matched &&
        !locMatch.matched &&
        !altSavedMatch.matched &&
        !groupMatch.matched
      ) {
        allTermsMatched = false;
        break;
      }

      const weightedTitle = titleMatch.score * 1.45;
      const weightedDomain = domainMatch.score * 1.15;
      const weightedUrl = urlMatch.score * 0.95;
      const weightedLoc = locMatch.score * 1.12;
      const weightedAltLoc = altSavedMatch.score * 0.95;
      const weightedGroup = groupMatch.score * 1.1;

      const bestTermScore = Math.max(
        weightedTitle,
        weightedDomain,
        weightedUrl,
        weightedLoc,
        weightedAltLoc,
        weightedGroup
      );

      // Multi-field corroboration bonus (e.g., term matches both domain and title)
      let corroboration = 0;
      if (titleMatch.matched && (urlMatch.matched || domainMatch.matched)) corroboration += 12;
      if (titleMatch.matched && (locMatch.matched || groupMatch.matched)) corroboration += 14;

      totalScore += bestTermScore + corroboration;

      if (titleMatch.matched) {
        titleRanges.push(...titleMatch.ranges);
        reasonSet.add('title');
      }
      if (urlMatch.matched) {
        urlRanges.push(...urlMatch.ranges);
        reasonSet.add(domainMatch.matched ? 'domain' : 'url');
      } else if (domainMatch.matched) {
        reasonSet.add('domain');
      }
      if (locMatch.matched) {
        locationRanges.push(...locMatch.ranges);
        reasonSet.add(item.folderBreadcrumb ? 'folder' : 'tab_group');
      } else if (altSavedMatch.matched) {
        reasonSet.add('folder');
      }
      if (groupMatch.matched) {
        reasonSet.add('tab_group');
      }
    }

    if (!allTermsMatched) continue;

    // Contextual boosts
    if (item.kind === 'bookmark') totalScore += 18;
    if (item.kind === 'tab') totalScore += item.active ? 28 : 20;
    if (item.openTabs.length > 0) {
      totalScore += 16;
      reasonSet.add('open_tab');
    }
    if (item.kind === 'folder' || item.kind === 'tab_group') {
      // Surface folders/tab groups prominently when their name directly matches
      if (reasonSet.has('title')) totalScore += 22;
    }
    if (item.isDuplicate) {
      reasonSet.add('duplicate');
    }

    results.push({
      item,
      score: Math.round(totalScore * 10) / 10,
      titleRanges: mergeHighlightRanges(titleRanges),
      urlRanges: mergeHighlightRanges(urlRanges),
      locationRanges: mergeHighlightRanges(locationRanges),
      matchReasons: Array.from(reasonSet),
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.item.timestamp ?? 0) - (a.item.timestamp ?? 0);
  });

  return results.slice(0, limit);
}
