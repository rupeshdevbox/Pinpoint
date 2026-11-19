import type {
  RawBookmarkNode,
  RawBrowserSnapshot,
  RawHistoryOrSessionItem,
  RawOpenTab,
  RawReadingListItem,
  RawTabGroup,
} from '../types';

const now = Date.now();
const hour = 3600 * 1000;
const day = 24 * hour;

export function createInitialMockData(): {
  bookmarkTree: RawBookmarkNode[];
  openTabs: RawOpenTab[];
  tabGroups: RawTabGroup[];
  readingList: RawReadingListItem[];
  historyAndSessions: RawHistoryOrSessionItem[];
} {
  const bookmarkTree: RawBookmarkNode[] = [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          parentId: '0',
          title: 'Bookmarks Bar',
          children: [
            {
              id: 'bm-101',
              parentId: '1',
              index: 0,
              title: 'Linear — Sprint 24 Issue Board',
              url: 'https://linear.app/acme/team/ENG/active',
              dateAdded: now - 2 * day,
            },
            {
              id: 'bm-102',
              parentId: '1',
              index: 1,
              title: 'Figma — Pinpoint Design System v3',
              url: 'https://www.figma.com/file/982341/Pinpoint-Design-System',
              dateAdded: now - 5 * day,
            },
            {
              id: 'f-eng',
              parentId: '1',
              index: 2,
              title: 'Engineering',
              dateAdded: now - 60 * day,
              children: [
                {
                  id: 'f-cloud',
                  parentId: 'f-eng',
                  index: 0,
                  title: 'Cloud & Infra',
                  dateAdded: now - 50 * day,
                  children: [
                    {
                      id: 'bm-201',
                      parentId: 'f-cloud',
                      index: 0,
                      title: 'Grafana — Production API Latency Dashboard',
                      url: 'https://grafana.internal.acme.dev/d/api-latency/prod-overview',
                      dateAdded: now - 3 * day,
                    },
                    {
                      id: 'bm-202',
                      parentId: 'f-cloud',
                      index: 1,
                      title: 'AWS IAM Role Explorer (us-east-1)',
                      url: 'https://us-east-1.console.aws.amazon.com/iam/home#/roles',
                      dateAdded: now - 14 * day,
                    },
                    {
                      id: 'bm-203',
                      parentId: 'f-cloud',
                      index: 2,
                      title: 'Cloudflare Zero Trust Tunnel Config',
                      url: 'https://one.dash.cloudflare.com/networks/tunnels',
                      dateAdded: now - 21 * day,
                    },
                  ],
                },
                {
                  id: 'f-frontend',
                  parentId: 'f-eng',
                  index: 1,
                  title: 'Frontend & Architecture',
                  dateAdded: now - 45 * day,
                  children: [
                    {
                      id: 'bm-210',
                      parentId: 'f-frontend',
                      index: 0,
                      title: 'Chrome Extensions Manifest V3 API Reference',
                      url: 'https://developer.chrome.com/docs/extensions/reference/api',
                      dateAdded: now - 1 * day,
                    },
                    {
                      id: 'bm-211',
                      parentId: 'f-frontend',
                      index: 1,
                      title: 'React 19 Compiler & Actions Migration Guide',
                      url: 'https://react.dev/blog/2024/12/05/react-19?utm_source=newsletter',
                      dateAdded: now - 9 * day,
                    },
                    {
                      id: 'bm-212',
                      parentId: 'f-frontend',
                      index: 2,
                      title: 'Pinpoint Design System Tokens (Figma)',
                      url: 'https://figma.com/file/982341/Pinpoint-Design-System/',
                      dateAdded: now - 12 * day,
                    },
                    {
                      id: 'bm-213',
                      parentId: 'f-frontend',
                      index: 3,
                      title: 'Vite Multi-Page Build Configuration',
                      url: 'https://vite.dev/guide/build.html#multi-page-app',
                      dateAdded: now - 7 * day,
                    },
                  ],
                },
                {
                  id: 'f-payments',
                  parentId: 'f-eng',
                  index: 2,
                  title: 'Payments & Billing',
                  dateAdded: now - 30 * day,
                  children: [
                    {
                      id: 'bm-220',
                      parentId: 'f-payments',
                      index: 0,
                      title: 'Stripe Webhooks Signature Verification',
                      url: 'https://docs.stripe.com/webhooks/signatures',
                      dateAdded: now - 18 * day,
                    },
                  ],
                },
              ],
            },
            {
              id: 'f-product',
              parentId: '1',
              index: 3,
              title: 'Product & Strategy',
              dateAdded: now - 40 * day,
              children: [
                {
                  id: 'f-q4',
                  parentId: 'f-product',
                  index: 0,
                  title: 'Q4 Launch Docs',
                  dateAdded: now - 25 * day,
                  children: [
                    {
                      id: 'bm-301',
                      parentId: 'f-q4',
                      index: 0,
                      title: 'Notion — Q4 Chrome Web Store Launch Checklist',
                      url: 'https://www.notion.so/acme/Q4-Chrome-Web-Store-Launch-89f12a',
                      dateAdded: now - 4 * day,
                    },
                    {
                      id: 'bm-302',
                      parentId: 'f-q4',
                      index: 1,
                      title: 'Stripe Webhook Signatures Spec',
                      url: 'https://docs.stripe.com/webhooks/signatures?utm_medium=docs',
                      dateAdded: now - 11 * day,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: '2',
          parentId: '0',
          title: 'Other Bookmarks',
          children: [
            {
              id: 'f-ai',
              parentId: '2',
              index: 0,
              title: 'AI & Research',
              dateAdded: now - 35 * day,
              children: [
                {
                  id: 'f-papers',
                  parentId: 'f-ai',
                  index: 0,
                  title: 'Papers & Benchmarks',
                  dateAdded: now - 30 * day,
                  children: [
                    {
                      id: 'bm-401',
                      parentId: 'f-papers',
                      index: 0,
                      title: 'Attention Is All You Need — arXiv PDF',
                      url: 'https://arxiv.org/abs/1706.03762',
                      dateAdded: now - 28 * day,
                    },
                    {
                      id: 'bm-402',
                      parentId: 'f-papers',
                      index: 1,
                      title: 'Anthropic — Building Effective Agents',
                      url: 'https://www.anthropic.com/research/building-effective-agents',
                      dateAdded: now - 6 * day,
                    },
                  ],
                },
              ],
            },
            {
              id: 'f-personal',
              parentId: '2',
              index: 1,
              title: 'Personal & Finance',
              dateAdded: now - 90 * day,
              children: [
                {
                  id: 'bm-501',
                  parentId: 'f-personal',
                  index: 0,
                  title: '2026 Tax Filing Portal & Receipts',
                  url: 'https://portal.taxexample.com/returns/2026',
                  dateAdded: now - 16 * day,
                },
                {
                  id: 'bm-502',
                  parentId: 'f-personal',
                  index: 1,
                  title: 'React 19 Release Notes (Saved Copy)',
                  url: 'https://react.dev/blog/2024/12/05/react-19',
                  dateAdded: now - 15 * day,
                },
              ],
            },
          ],
        },
        {
          id: '3',
          parentId: '0',
          title: 'Mobile Bookmarks',
          children: [
            {
              id: 'bm-601',
              parentId: '3',
              index: 0,
              title: 'Kyoto Autumn Itinerary & Rail Pass Guide',
              url: 'https://japan-guide.com/e/e2158.html',
              dateAdded: now - 8 * day,
            },
            {
              id: 'bm-602',
              parentId: '3',
              index: 1,
              title: 'React 19 Upgrade Guide',
              url: 'https://www.react.dev/blog/2024/12/05/react-19/',
              dateAdded: now - 19 * day,
            },
          ],
        },
      ],
    },
  ];

  const tabGroups: RawTabGroup[] = [
    { id: 11, title: 'Sprint 24', color: 'blue', collapsed: false, windowId: 1 },
    { id: 12, title: 'Production Ops', color: 'green', collapsed: false, windowId: 1 },
    { id: 21, title: 'AI Research', color: 'purple', collapsed: true, windowId: 2 },
    { id: 22, title: '', color: 'orange', collapsed: false, windowId: 2 },
  ];

  const openTabs: RawOpenTab[] = [
    {
      id: 1001,
      windowId: 1,
      index: 0,
      title: 'Linear — Sprint 24 Issue Board',
      url: 'https://linear.app/acme/team/ENG/active',
      pinned: true,
      active: true,
      audible: false,
      groupId: 11,
      lastAccessed: now - 2 * 60 * 1000,
    },
    {
      id: 1002,
      windowId: 1,
      index: 1,
      title: 'GitHub PR #418 — Fuzzy Folder Search Engine',
      url: 'https://github.com/acme/pinpoint-extension/pull/418',
      pinned: false,
      active: false,
      audible: false,
      groupId: 11,
      lastAccessed: now - 14 * 60 * 1000,
    },
    {
      id: 1003,
      windowId: 1,
      index: 2,
      title: 'Grafana — Production API Latency Dashboard',
      url: 'https://grafana.internal.acme.dev/d/api-latency/prod-overview',
      pinned: false,
      active: false,
      audible: false,
      groupId: 12,
      lastAccessed: now - 35 * 60 * 1000,
    },
    {
      id: 1004,
      windowId: 2,
      index: 0,
      title: 'Anthropic — Building Effective Agents',
      url: 'https://www.anthropic.com/research/building-effective-agents',
      pinned: false,
      active: true,
      audible: false,
      groupId: 21,
      lastAccessed: now - 50 * 60 * 1000,
    },
    {
      id: 1005,
      windowId: 2,
      index: 1,
      title: 'Chrome Web Store Developer Dashboard',
      url: 'https://chrome.google.com/webstore/devconsole',
      pinned: false,
      active: false,
      audible: false,
      groupId: 22,
      lastAccessed: now - 2 * hour,
    },
  ];

  const readingList: RawReadingListItem[] = [
    {
      title: 'Web.dev — Core Web Vitals Optimization Deep Dive',
      url: 'https://web.dev/articles/vitals',
      hasBeenRead: false,
      creationTime: now - 3 * day,
      lastUpdateTime: now - 3 * day,
    },
    {
      title: 'MDN — Browser Extensions Cross-Browser Compatibility',
      url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension',
      hasBeenRead: false,
      creationTime: now - 6 * day,
      lastUpdateTime: now - 5 * day,
    },
    {
      title: 'Tailwind CSS v4.0 Engine Architecture',
      url: 'https://tailwindcss.com/blog/tailwindcss-v4',
      hasBeenRead: true,
      creationTime: now - 14 * day,
      lastUpdateTime: now - 10 * day,
    },
  ];

  const historyAndSessions: RawHistoryOrSessionItem[] = [
    {
      id: 'session-closed-1',
      kind: 'closed_tab',
      title: 'PostgreSQL 17 Query Planner Explain Visualizer',
      url: 'https://explain.dalibo.com/plan/78a9c12',
      lastVisitTime: now - 22 * 60 * 1000,
      sessionId: 'sess-1',
    },
    {
      id: 'session-closed-2',
      kind: 'closed_tab',
      title: 'Chrome Tab Groups API — chrome.tabGroups',
      url: 'https://developer.chrome.com/docs/extensions/reference/api/tabGroups',
      lastVisitTime: now - 75 * 60 * 1000,
      sessionId: 'sess-2',
    },
    {
      id: 'hist-1',
      kind: 'history',
      title: 'Lucide Icons — Search & Folder Icon Catalog',
      url: 'https://lucide.dev/icons/',
      lastVisitTime: now - 4 * hour,
      visitCount: 19,
    },
    {
      id: 'hist-2',
      kind: 'history',
      title: 'Raycast UI Design Guidelines',
      url: 'https://developers.raycast.com/design-guidelines/user-interface',
      lastVisitTime: now - 18 * hour,
      visitCount: 7,
    },
  ];

  return {
    bookmarkTree,
    openTabs,
    tabGroups,
    readingList,
    historyAndSessions,
  };
}

export function buildMockSnapshot(
  state: ReturnType<typeof createInitialMockData>,
  hasHistoryPermission: boolean
): RawBrowserSnapshot {
  return {
    bookmarkTree: structuredClone(state.bookmarkTree),
    openTabs: structuredClone(state.openTabs),
    tabGroups: structuredClone(state.tabGroups),
    readingList: structuredClone(state.readingList),
    historyAndSessions: hasHistoryPermission ? structuredClone(state.historyAndSessions) : [],
    hasHistoryPermission,
  };
}
