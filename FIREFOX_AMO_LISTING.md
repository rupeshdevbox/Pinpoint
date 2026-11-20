# Firefox Add-ons (AMO) Submission Guide — Pinpoint

Everything required by Mozilla's **Firefox Add-ons Developer Hub (`addons.mozilla.org`)**—including Firefox's mandatory `data_collection_permissions` manifest declaration, `addons-linter` validation, and the clean **Source Code ZIP** required for Vite/TypeScript builds—is ready to upload.

---

## Two Ways to Publish on Firefox Add-ons

### Way 1 — Automated 1-Command CLI Publish *(Fastest!)*
Mozilla allows creating and submitting brand-new extensions directly via API:
1. Sign in with your Firefox Account at **[addons.mozilla.org/en-US/developers/addon/api/key/](https://addons.mozilla.org/en-US/developers/addon/api/key/)** and generate API credentials.
2. Add both values to your local `.env` file:
   ```ini
   AMO_JWT_ISSUER=user:12345678:999
   AMO_JWT_SECRET=your_amo_secret_here
   ```
3. Run:
   ```bash
   npm run publish:firefox
   ```
   This automatically uploads `pinpoint-firefox-v1.0.0.zip`, attaches `pinpoint-firefox-source-v1.0.0.zip` + reviewer build instructions, populates the store listing & privacy policy, and submits Pinpoint for listed review!

*(Alternatively, you can also sign in to `addons.mozilla.org` in VS Code's Integrated Browser and share the tab in chat, and I can complete the form directly in the browser just like we did for Chrome Web Store.)*

---

### Way 2 — Manual Browser Upload (`~2 minutes`)

1. **Open Mozilla Developer Hub**:
   - Go to **[addons.mozilla.org/en-US/developers/addon/submit/distribution](https://addons.mozilla.org/en-US/developers/addon/submit/distribution)** and sign in.
   - Choose **"On this site"** (*Listed on addons.mozilla.org*) and click **Continue**.

2. **Upload Extension File**:
   - Select **`releases/pinpoint-firefox-v1.0.0.zip`**.
   - Wait a few seconds for green validation (`0 errors`), then click **Continue**.

3. **Upload Source Code & Reviewer Notes** *(Important — AMO requires this for TypeScript/Vite extensions)*:
   - *"Do you need to submit source code?"* → Select **Yes**.
   - Upload **`releases/pinpoint-firefox-source-v1.0.0.zip`**.
   - Paste these **Notes for Reviewers**:
     ```text
     Pinpoint is built with TypeScript, React 19, Tailwind CSS v4, and Vite.

     Exact reproduction steps (macOS / Linux / Windows, Node.js >= 20, npm >= 10):
     1. Extract pinpoint-firefox-source-v1.0.0.zip
     2. Run: npm ci
     3. Run: npm run build:firefox
     4. Built unpacked extension is emitted in dist/firefox/ (matching pinpoint-firefox-v1.0.0.zip).

     All search indexing and bookmark/tab organization run 100% locally in memory with zero external network requests.
     ```

4. **Store Listing Details (Copy & Paste)**:
   - **Name**: `Pinpoint — Bookmark, Folder & Tab Search`
   - **Add-on URL Slug**: `pinpoint-bookmark-tab-search`
   - **Summary** *(<= 250 chars)*:
     `Instantly search saved bookmarks, nested folders, open tabs, and history — and reveal exact saved folder locations.`
   - **Categories**: Check **`Bookmarks`** and **`Tabs`**
   - **License**: `MIT License`
   - **Privacy Policy**: Check *"This add-on has a Privacy Policy"* and paste the contents of [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)
   - **Homepage**: `https://github.com/rupeshdevbox/Pinpoint`
   - **Support Site**: `https://github.com/rupeshdevbox/Pinpoint/issues`
   - **Description**:
     ```text
     Stop hunting through dozens of nested folders and browser windows to find a link you know you saved.

     Pinpoint is a fast, keyboard-first Command Palette (Cmd+Shift+K on macOS / Alt+Shift+K on Windows & Linux) and Firefox Sidebar that finds any saved URL in milliseconds — and shows you the exact Bookmark Folder where it lives.

     WHY PINPOINT?
     • See Exact Saved Locations Instantly: Every search result displays its full interactive folder breadcrumb (e.g., Bookmarks Toolbar › Engineering › Cloud & Infra).
     • Reveal in Folder Explorer: Click any folder trail or press Cmd/Ctrl+Shift+L to browse sibling bookmarks in context with your matched link highlighted.
     • Smart Open-Tab Correlation: Automatically detects if a saved bookmark is already open in a browser tab so you can switch straight to the existing tab instead of opening duplicates.
     • Power Search Operators: Filter effortlessly with in:folder, site:domain.com, is:open, or is:duplicate.
     • Quick Organization & Duplicate Cleanup: Rename bookmarks, move links between folders with fuzzy folder search, create subfolders on the fly, clean up duplicate URLs saved across multiple folders, and undo accidental deletes with one click.
     • 100% Local & Private: Zero external servers, zero analytics, zero tracking, and no invasive <all_urls> host permissions.
     ```

5. **Screenshots & Icon** *(After submission, click "Manage Listing" → Images)*:
   - Upload `store-assets/store-icon-128x128.png` and screenshots from `store-assets/screenshots/`.
