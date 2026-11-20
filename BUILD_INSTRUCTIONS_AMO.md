# Mozilla Add-ons (AMO) Reviewer Build Instructions — Pinpoint v1.0.0

This archive contains the complete, unminified TypeScript + React + Vite source code used to build **`pinpoint-firefox-v1.0.0.zip`**.

## Prerequisites

- **Operating System**: macOS, Linux, or Windows
- **Node.js**: `>= 20.x` (built and verified with Node.js `v22+` / `v26.x`)
- **npm**: `>= 10.x`

## Exact Reproduction Steps

From the root of the extracted source archive, run:

```bash
npm ci
npm run build:firefox
```

## Build Output Location

- **Unpacked Firefox Extension Directory**: `dist/firefox/`
- **Packaged Firefox Extension Archive**: `releases/pinpoint-firefox-v1.0.0.zip`

## Architecture Notes for Reviewers

- **Entry Points**:
  - `popup.html` & `sidepanel.html` → `src/main.tsx` → `src/App.tsx`
  - Background script (`background.scripts` in Firefox MV3) → `src/background/service-worker.ts`
- **Icons**: Generated deterministically from `scripts/generate-icons.mjs` into `public/icons/`.
- **Manifest**: Generated deterministically in `scripts/build-extension.mjs` (matching `src/manifest/createManifest.ts`) with `browser_specific_settings.gecko.data_collection_permissions.required = ["none"]`.
- **Zero External Network Calls**: All bookmark/tab indexing, fuzzy search, duplicate detection, and UI state execute 100% locally in memory using standard WebExtensions APIs (`bookmarks`, `tabs`, `storage`, and optional user-initiated `history` / `sessions`).
