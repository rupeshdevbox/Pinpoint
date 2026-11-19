# Chrome Web Store Submission Guide — Pinpoint

Everything needed to publish **Pinpoint** is built, validated, and ready to drag-and-drop into the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Quick 5-Step First-Time Publish Checklist

> **Why manual login is required once:** Google requires every Chrome Web Store publisher to sign in with their own Google account + 2-Step Verification (and complete the one-time $5 developer registration if you haven't already) to create a new extension item and accept Google's Developer Distribution Agreement.

1. **Sign In & Upload Package**:
   - Open **[chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)**.
   - Click **+ New Item** (top right) and upload **`releases/pinpoint-chrome-v1.0.0.zip`**.
2. **Fill Out the "Store Listing" Tab**:
   - Paste the **Detailed Description** and select **Category → Productivity / Workflow & Planning** (see Section 1 below).
   - **Store Icon (`128 × 128`)**: Upload `store-assets/store-icon-128x128.png`.
   - **Screenshots (`1280 × 800`, strict 24-bit RGB PNG — all 5 ready!)**: Upload all 5 files from `store-assets/screenshots/`:
     1. `01-instant-search-and-tab-groups.png`
     2. `02-reveal-in-folder-explorer.png`
     3. `03-quick-organize-and-move-folders.png`
     4. `04-duplicate-bookmark-finder.png`
     5. `05-light-theme-and-side-panel.png`
   - **Small Promo Tile (`440 × 280`, 24-bit RGB PNG)**: Upload `store-assets/promo-small-440x280.png`.
   - **Marquee Promo Tile (`1400 × 560`, 24-bit RGB PNG)**: Upload `store-assets/promo-marquee-1400x560.png`.
3. **Fill Out the "Privacy Practices" Tab**:
   - Paste the **Single Purpose Description** and **Permission Justifications** from Section 2 below.
   - Select **"No, I am not using Remote code"** and certify **"I do not collect or use any user data"**.
   - If hosting a Privacy Policy URL, publish [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) (e.g., via GitHub Pages / Gist / Notion public page).
4. **Distribution Tab**:
   - Visibility: **Public** (or **Unlisted** if testing privately first) • Regions: **All regions**.
5. **Click "Submit for Review"!**
   - Because Pinpoint uses zero `<all_urls>` host permissions, zero content scripts, and zero remote code, Chrome Web Store automated + human review is typically very fast.

*(For future version updates via CLI/CI, run `npm run publish:chrome -- --submit` after setting `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, and `CWS_REFRESH_TOKEN`.)*

---

## 1. Store Listing Tab

- **Title** *(40 / 45 characters max)*:
  `Pinpoint — Bookmark, Folder & Tab Search`

- **Summary** *(126 / 132 characters max)*:
  `Instantly search saved bookmarks, nested folders, open tabs, Chrome tab groups, and Reading List — and reveal exact locations.`

- **Category**:
  `Productivity` → `Workflow & Planning`

- **Official URL / Homepage**:
  `https://github.com/rupeshdevbox/Pinpoint`

- **Privacy Policy URL**:
  `https://github.com/rupeshdevbox/Pinpoint/blob/main/PRIVACY_POLICY.md`

- **Language**:
  `English (United States)`

- **Detailed Description**:
  ```text
  Stop hunting through dozens of nested folders and browser windows to find a link you know you saved.

  Pinpoint is a fast, keyboard-first Command Palette (Cmd+Shift+K / Ctrl+Shift+K) and Chrome Side Panel that finds any saved URL in milliseconds — and shows you the exact Bookmark Folder or Chrome Tab Group where it lives.

  WHY PINPOINT?
  • See Exact Saved Locations Instantly: Every search result displays its full interactive folder breadcrumb (e.g., Bookmarks Bar › Work › Q4 Docs) and colored Chrome Tab Group badge.
  • Reveal in Folder Explorer: Click any folder trail or press Cmd/Ctrl+Shift+L to browse sibling bookmarks in context with your matched link highlighted, or jump straight to Chrome Bookmark Manager.
  • Smart Open-Tab Correlation: If a saved bookmark is already open in a browser window or Tab Group, Pinpoint highlights both its saved folder and live tab so you can switch straight to the existing tab instead of opening duplicates.
  • Unified Search Across Browser Sources: Search Bookmarks, Nested Folders, Open Tabs, Colored Chrome Tab Groups, Chrome Reading List, and (optionally) Recently Closed Tabs & History.
  • Power Search Operators: Filter effortlessly with in:folder, group:name, site:domain.com, is:open, is:duplicate, or is:unread.
  • Quick Organization & Duplicate Cleanup: Rename bookmarks, move links between folders with fuzzy folder search, create subfolders on the fly, clean up duplicate URLs saved across multiple folders, and undo accidental deletes with one click.
  • 100% Local & Private: Zero external servers, zero analytics, zero tracking, and no invasive <all_urls> host permissions.
  ```

---

## 2. Privacy Practices Tab (Exact Dashboard Answers)

- **Single Purpose Description**:
  > Pinpoint provides a unified local search palette and side panel to find saved bookmarks, bookmark folders, open tabs, Chrome tab groups, and Reading List entries and reveal or organize their locations.

- **Are you using remote code?**
  > **No, I am not using Remote code.**

- **Data Usage Certification**:
  > Check **"I do not collect or use any user data"** (Pinpoint runs 100% locally in the browser with zero network requests).

### Permission Justifications (Copy & Paste)

- **`bookmarks`**:
  > Required to index the user's bookmark tree and nested folder paths so users can search saved bookmarks, reveal their containing folder, edit/move bookmarks, and remove duplicates upon user action.

- **`tabs`**:
  > Required to read open tab titles and URLs so users can search open tabs alongside bookmarks, see whether a saved bookmark is already open, and switch directly to the matching tab/window.

- **`tabGroups`**:
  > Required to display the name and color of the Chrome Tab Group containing a matched open tab so users can locate which tab group holds their URL.

- **`readingList`**:
  > Required to include Chrome Reading List items in unified search results and allow marking items read or unread.

- **`storage`**:
  > Required to persist local user interface preferences (such as Light/Dark/System theme and default tab-switching preference) via `chrome.storage.local`.

- **`sidePanel`**:
  > Required so users can optionally dock the search and folder-explorer interface in Chrome's Side Panel for persistent browsing alongside web pages.

- **`favicon`**:
  > Required to display cached browser favicons next to bookmark and tab search results offline via Chrome's built-in `_favicon` extension API without making external network requests.

- **Optional Permissions (`history`, `sessions`)**:
  > Requested only when the user explicitly clicks "Enable Local History & Closed Tabs" so users can optionally include recently closed tabs/windows and local browsing history in their search results.
