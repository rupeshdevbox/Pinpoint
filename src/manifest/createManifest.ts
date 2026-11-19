import { BRAND } from '../constants/brand';

export type ExtensionTarget = 'chrome' | 'firefox';

export function createExtensionManifest(target: ExtensionTarget): Record<string, unknown> {
  const description =
    'Instantly search saved bookmarks, nested folders, open tabs, Chrome tab groups, and Reading List — and reveal exact locations.';

  const common = {
    manifest_version: 3,
    name: BRAND.fullName,
    short_name: BRAND.shortName,
    version: BRAND.version,
    description,
    homepage_url: 'https://github.com/rupeshdevbox/Pinpoint',
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_title: 'Pinpoint — Search Bookmarks, Folders & Tab Groups',
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
      },
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: BRAND.shortcutDefault,
          mac: 'Command+Shift+K',
        },
        description: 'Open Pinpoint Bookmark & Tab Search',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
  };

  if (target === 'firefox') {
    return {
      ...common,
      background: {
        scripts: ['service-worker.js'],
        type: 'module',
      },
      sidebar_action: {
        default_title: BRAND.shortName,
        default_panel: 'sidepanel.html',
        default_icon: 'icons/icon-32.png',
      },
      permissions: ['bookmarks', 'tabs', 'storage'],
      optional_permissions: ['history', 'sessions'],
      browser_specific_settings: {
        gecko: {
          id: BRAND.firefoxExtensionId,
          strict_min_version: '121.0',
        },
      },
    };
  }

  return {
    ...common,
    minimum_chrome_version: '120',
    background: {
      service_worker: 'service-worker.js',
      type: 'module',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    permissions: [
      'bookmarks',
      'tabs',
      'tabGroups',
      'readingList',
      'storage',
      'sidePanel',
      'favicon',
    ],
    optional_permissions: ['history', 'sessions'],
  };
}
