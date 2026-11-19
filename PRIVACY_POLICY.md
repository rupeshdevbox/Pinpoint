# Privacy Policy — Pinpoint (Bookmark, Folder & Tab Search)

**Effective Date:** November 19, 2026

## Overview

**Pinpoint — Bookmark, Folder & Tab Search** ("Pinpoint") is designed from the ground up with strict local-only privacy. Pinpoint **does not collect, store, transmit, sell, or share any personal data, browsing activity, or bookmark data** outside of your local browser.

## Data Access & Local Processing

All indexing, fuzzy search, duplicate detection, and folder organization execute **100% locally in memory** on your device using standard browser extension APIs:

1. **Bookmarks (`bookmarks`)**: Read locally to index bookmark titles, URLs, and nested folder hierarchies so you can search and reveal where links are saved, and modified only when you explicitly edit, move, or delete a bookmark.
2. **Open Tabs & Tab Groups (`tabs`, `tabGroups`)**: Read locally to let you search open URLs, see colored Chrome Tab Groups, correlate saved bookmarks with open tabs, and switch directly to active tabs.
3. **Reading List (`readingList`)**: Read locally so you can find saved Reading List links alongside your bookmarks and toggle read/unread status.
4. **Local Preferences (`storage`)**: Used solely to store UI preferences (such as Dark/Light/System theme and tab-switching behavior) locally inside your browser.
5. **Browser Favicons (`favicon`)**: Uses Chrome's built-in offline `_favicon` extension cache rather than fetching icons from external third-party servers.
6. **Optional History & Sessions (`history`, `sessions`)**: Disabled by default. Only accessed locally if you explicitly click "Enable Local History & Closed Tabs" and grant permission in your browser.

## Zero Network Transmission & Third Parties

- **No Analytics or Telemetry**: Pinpoint contains zero analytics SDKs, crash trackers, or external scripts.
- **No External Servers**: Pinpoint makes zero outbound network requests with your URLs, search queries, or browser data.
- **No Remote Code**: All executable code is packaged directly inside the audited extension bundle.

## User Control & Removal

You can revoke optional permissions or uninstall Pinpoint at any time via `chrome://extensions`, which immediately removes all extension preferences stored in local browser storage.
