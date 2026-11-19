const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'si',
  'ref_src',
  'ref_url',
]);

export function isBookmarkletUrl(rawUrl: string): boolean {
  return rawUrl.trim().toLowerCase().startsWith('javascript:');
}

export function isRestrictedBrowserUrl(rawUrl: string): boolean {
  const lower = rawUrl.trim().toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('brave://') ||
    lower.startsWith('about:') ||
    lower.startsWith('moz-extension://') ||
    lower.startsWith('file://') ||
    lower.startsWith('view-source:')
  );
}

/**
 * Produces a canonical URL string for cross-correlating Bookmarks with Open Tabs
 * and detecting duplicate bookmarks across folders without merging distinct hash routes.
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (isBookmarkletUrl(trimmed)) {
    return trimmed.replace(/\s+/g, ' ');
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol === 'http:' || protocol === 'https:') {
      const cleanProtocol = 'https:';
      let host = parsed.hostname.toLowerCase();
      if (host.startsWith('www.') && host.length > 4) {
        host = host.slice(4);
      }

      const port =
        parsed.port && parsed.port !== '80' && parsed.port !== '443' ? `:${parsed.port}` : '';

      let pathname = parsed.pathname || '/';
      if (pathname.length > 1) {
        pathname = pathname.replace(/\/+$/, '');
      }

      const keptParams: Array<[string, string]> = [];
      parsed.searchParams.forEach((value, key) => {
        if (!TRACKING_PARAMS.has(key.toLowerCase())) {
          keptParams.push([key, value]);
        }
      });
      keptParams.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));

      const searchStr =
        keptParams.length > 0
          ? '?' +
            keptParams
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join('&')
          : '';

      const hash = parsed.hash && parsed.hash !== '#' ? parsed.hash : '';

      return `${cleanProtocol}//${host}${port}${pathname}${searchStr}${hash}`;
    }

    // Browser-internal URLs such as chrome://extensions/
    let clean = `${protocol}//${parsed.host.toLowerCase()}${parsed.pathname}`;
    if (clean.length > `${protocol}//`.length + 1) {
      clean = clean.replace(/\/+$/, '');
    }
    if (parsed.search) clean += parsed.search;
    if (parsed.hash && parsed.hash !== '#') clean += parsed.hash;
    return clean;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

export function extractDomain(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (isBookmarkletUrl(trimmed)) return 'bookmarklet';

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      const host = parsed.hostname.toLowerCase();
      return host.startsWith('www.') && host.length > 4 ? host.slice(4) : host;
    }
    if (parsed.hostname) {
      return `${protocol.replace(':', '')}://${parsed.hostname.toLowerCase()}`;
    }
    return protocol.replace(':', '');
  } catch {
    return trimmed.split('/')[0] ?? trimmed;
  }
}

export function formatDisplayUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (isBookmarkletUrl(trimmed)) {
    const snippet = trimmed.slice('javascript:'.length).trim();
    return `javascript: ${snippet.slice(0, 60)}${snippet.length > 60 ? '…' : ''}`;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      let host = parsed.hostname.toLowerCase();
      if (host.startsWith('www.') && host.length > 4) {
        host = host.slice(4);
      }
      const port =
        parsed.port && parsed.port !== '80' && parsed.port !== '443' ? `:${parsed.port}` : '';
      let path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
      try {
        path = decodeURIComponent(path);
      } catch {
        // Keep encoded pathname if malformed UTF-8 sequence
      }
      const query = parsed.search && parsed.search.length <= 42 ? parsed.search : parsed.search ? `${parsed.search.slice(0, 38)}…` : '';
      const hash = parsed.hash && parsed.hash !== '#' ? parsed.hash : '';
      return `${host}${port}${path}${query}${hash}`;
    }
    return trimmed.replace(/\/+$/, '');
  } catch {
    return trimmed;
  }
}

const GENERIC_SUBDOMAINS = new Set([
  'www',
  'docs',
  'doc',
  'app',
  'apps',
  'console',
  'portal',
  'one',
  'dash',
  'dashboard',
  'developer',
  'developers',
  'dev',
  'api',
  'internal',
  'help',
  'support',
  'blog',
]);

export function getMonogramLetter(domain: string, title?: string): string {
  const cleanDomain = domain.replace(/^(chrome|edge|about|file):\/\//i, '').trim();
  if (cleanDomain && cleanDomain !== 'bookmarklet') {
    const parts = cleanDomain.split('.').filter(Boolean);
    if (parts.length >= 2) {
      // Pick first non-generic label before TLD (e.g., docs.stripe.com -> stripe -> S)
      const candidates = parts.slice(0, -1);
      const meaningful = candidates.find(
        (label) =>
          !GENERIC_SUBDOMAINS.has(label.toLowerCase()) &&
          !/^(us|eu|ap|sa|ca|me|af)-(east|west|central|north|south)-\d+$/i.test(label)
      );
      const chosen = meaningful ?? candidates[candidates.length - 1] ?? parts[0];
      if (chosen?.[0]) return chosen[0].toUpperCase();
    }
    const ch = cleanDomain[0];
    if (ch) return ch.toUpperCase();
  }
  const cleanTitle = (title ?? '').trim();
  if (cleanTitle) {
    const match = cleanTitle.match(/[A-Za-z0-9]/);
    if (match) return match[0].toUpperCase();
  }
  return '•';
}
