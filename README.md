<div align="center">

<img src="./public/icons/icon.svg" alt="Pinpoint Logo" width="88" height="88" />

# Pinpoint

### **Instant Bookmark, Nested Folder & Chrome Tab Group Search**

*Never ask “Where did I save that link, or which Chrome tab folder is it in?” again.*

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Pinpoint-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/fadblajfeigpjfddhcmipinicihkdjon)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0EA5E9?style=for-the-badge&logo=chromatic&logoColor=white)](#architecture--how-it-works)
[![Cross Browser](https://img.shields.io/badge/Chrome_%E2%80%A2_Brave_%E2%80%A2_Arc_%E2%80%A2_Edge_%E2%80%A2_Firefox-10B981?style=for-the-badge)](#quick-start--installation)
[![Privacy](https://img.shields.io/badge/100%25_Local-Zero_Telemetry-F59E0B?style=for-the-badge)](./PRIVACY_POLICY.md)

[**Visual Tour**](#-visual-tour) · [**How It Works**](#-architecture--how-it-works) · [**Search Operators**](#-power-search-operators) · [**Keyboard Shortcuts**](#%EF%B8%8F-keyboard-first-shortcuts) · [**Install**](#-quick-start--installation)

<br />

<img src="./store-assets/promo-marquee-1400x560.png" alt="Pinpoint — Instant Bookmark, Folder & Chrome Tab Group Finder" width="100%" />

</div>

---

## ✨ Why Pinpoint?

Browsers make it effortless to save hundreds of bookmarks across nested folders, group dozens of tabs into colored **Chrome Tab Groups**, and stash articles in your **Reading List** — yet finding *where* something lives later feels impossible.

| Everyday Browser Pain | How **Pinpoint** Solves It |
| :--- | :--- |
| 📁 *"I saved that doc somewhere, maybe under Work or Q4?"* | Shows the **full interactive folder breadcrumb** (`Bookmarks Bar › Engineering › Cloud & Infra`) right on every result. |
| 🎨 *"Which window or colored Chrome Tab Group has that tab open?"* | Displays Chrome's **exact 9 Tab Group colors + Window #** (`● Sprint 24 • W1`) and switches straight to the live tab. |
| 🔁 *"I keep opening duplicate tabs for links I already have open."* | **Cross-correlates Bookmarks ↔ Open Tabs** automatically so `Enter` jumps to your existing open tab. |
| 🧭 *"What else did I save alongside that bookmark?"* | One click (or `⌘⇧L`) opens **Reveal in Folder Explorer** with your target bookmark highlighted (`Located Here`). |
| 🧹 *"I accidentally saved the same URL in three different folders."* | **Smart Duplicate Finder** strips noisy `utm_*` & `www.` variants to clean up redundant copies with 1-click **Undo**. |
| 🔒 *"Extensions ask for scary `Read all data on all websites` permissions."* | **Zero `<all_urls>` host permissions**, zero content scripts, zero external servers, and 100% offline execution. |

---

## 🎨 Visual Tour

### 1. Unified Command Palette (`⌘⇧K` / `Ctrl+Shift+K`)
Search across **Bookmarks**, **Open Tabs**, **Colored Chrome Tab Groups**, **Folders**, **Reading List**, and (optionally) **History & Recently Closed Tabs** in a single keystroke.

<p align="center">
  <img src="./store-assets/screenshots/01-instant-search-and-tab-groups.png" alt="Instant Search Across Bookmarks, Folders and Chrome Tab Groups" width="100%" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h4 align="center">📍 Reveal in Folder Explorer</h4>
      <img src="./store-assets/screenshots/02-reveal-in-folder-explorer.png" alt="Reveal in Folder Explorer" width="100%" />
      <p align="center"><sub>Click any folder breadcrumb or Tab Group badge to inspect sibling items with your target link highlighted in place.</sub></p>
    </td>
    <td width="50%" valign="top">
      <h4 align="center">⚡ Quick Edit &amp; Move-to-Folder</h4>
      <img src="./store-assets/screenshots/03-quick-organize-and-move-folders.png" alt="Quick Organize and Move Folders" width="100%" />
      <p align="center"><sub>Rename bookmarks, fuzzy-search destination folders, create new subfolders inline, and undo with one click.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4 align="center">🧹 Duplicate Clutter Finder</h4>
      <img src="./store-assets/screenshots/04-duplicate-bookmark-finder.png" alt="Duplicate Bookmark Finder" width="100%" />
      <p align="center"><sub>Detects identical URLs across multiple folders (even with <code>utm_*</code> tracking differences) for effortless cleanup.</sub></p>
    </td>
    <td width="50%" valign="top">
      <h4 align="center">🌓 Light &amp; Dark Themes + Side Panel</h4>
      <img src="./store-assets/screenshots/05-light-theme-and-side-panel.png" alt="Light Theme and Chrome Side Panel" width="100%" />
      <p align="center"><sub>Use as an instant toolbar popup or dock persistently alongside your workflow in Chrome Side Panel.</sub></p>
    </td>
  </tr>
</table>

---

## 🧠 Architecture & How It Works

### Unified Local Indexing & Cross-Correlation Pipeline

Pinpoint runs **100% locally in memory** with zero external network calls. Whenever you open the palette (or as tabs and bookmarks change while docked in the Side Panel), Pinpoint builds a cross-referenced index in milliseconds:

```mermaid
flowchart LR
  subgraph Sources["🌐 Browser Sources (Local MV3 APIs)"]
    BM["📁 Bookmarks Tree\nchrome.bookmarks"]:::amber
    TB["🪟 Open Tabs\nchrome.tabs"]:::sky
    TG["🎨 Tab Groups\nchrome.tabGroups"]:::violet
    RL["📖 Reading List\nchrome.readingList"]:::emerald
    HS["🕒 History & Closed\nOptional Permission"]:::slate
  end

  subgraph Engine["⚙️ Pinpoint Core Engine"]
    NORM["🔗 URL Canonicalizer\nStrips www & utm_* params\nPreserves SPA #hash routes"]:::indigo
    IDX["🧭 Location Indexer\nBuilds Folder Breadcrumbs\nCorrelates Bookmarks ↔ Live Tabs\nClusters Duplicate URLs"]:::indigo
    FUZZ["⚡ Weighted Search Engine\nFuzzy + Word-Boundary + Domain\nCross-Field Multi-Token Scoring"]:::emerald
  end

  subgraph Surfaces["✨ Interactive Surfaces"]
    POP["⌨️ Command Palette\nPopup (⌘⇧K)"]:::violet
    SIDE["📐 Persistent Dock\nChrome Side Panel"]:::sky
    EXP["📍 Folder & Group Explorer\nEdit • Move • Undo"]:::amber
  end

  BM & TB & TG & RL & HS --> NORM --> IDX --> FUZZ --> POP & SIDE
  POP & SIDE <--> EXP

  classDef indigo fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#f8fafc
  classDef emerald fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc
  classDef amber fill:#78350f,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
  classDef violet fill:#4c1d95,stroke:#c084fc,stroke-width:2px,color:#f8fafc
  classDef sky fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
  classDef slate fill:#1e293b,stroke:#94a3b8,stroke-width:2px,color:#f8fafc
```

### "Where Did I Save It?" Interaction Flow

```mermaid
flowchart TD
  START(["⌨️ Press ⌘⇧K / Ctrl+Shift+K"]):::violet --> TYPE["🔍 Type keywords or operators\ne.g. 'cloud grafana' or 'group:Sprint'"]:::indigo
  TYPE --> MATCH["✨ Instant Ranked Results\nShows Folder Path + Colored Tab Group + Live Tab Badge"]:::sky

  MATCH -->|"Press ↵ Enter"| CHECK{"Already open\nin a browser tab?"}:::amber
  CHECK -->|"Yes"| SWITCH["🟢 Focus Window & Switch\nto Existing Open Tab"]:::emerald
  CHECK -->|"No"| OPEN["🚀 Open URL in Active\nor Background Tab (⌘↵)"]:::emerald

  MATCH -->|"Click Breadcrumb or ⌘⇧L"| REVEAL["📍 Reveal in Folder / Tab Group\nHighlights 'Located Here' among siblings"]:::amber
  MATCH -->|"Press E"| ORGANIZE["🗂️ Rename, Move Folder, or\nCreate Subfolder (+ ⌘Z Undo)"]:::violet

  classDef indigo fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#f8fafc
  classDef emerald fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc
  classDef amber fill:#78350f,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
  classDef violet fill:#4c1d95,stroke:#c084fc,stroke-width:2px,color:#f8fafc
  classDef sky fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
```

---

## 🔎 Power Search Operators

Combine plain keywords across fields (for example, typing `engineering stripe` matches folder `Engineering` + title `Stripe`) or narrow instantly with operators:

| Operator | Example | What It Matches |
| :--- | :--- | :--- |
| `in:<folder>` | `in:Engineering` or `in:"Q4 Docs"` | Items saved inside a matching bookmark folder path |
| `group:<name\|color>` | `group:Sprint` or `group:purple` | Tabs (or bookmarked URLs currently open) in a Chrome Tab Group |
| `site:<domain>` | `site:github.com` | Links matching the specified hostname or domain |
| `is:open` | `is:open figma` | Saved bookmarks or URLs that are currently open in a browser tab |
| `is:duplicate` | `is:duplicate` | Bookmarks saved across 2 or more folders |
| `is:unread` | `is:unread` | Unread entries in your Chrome Reading List |

---

## ⌨️ Keyboard-First Shortcuts

| Action | macOS | Windows / Linux |
| :--- | :---: | :---: |
| **Launch Pinpoint anywhere** | `⌘` `⇧` `K` | `Ctrl` + `Shift` + `K` |
| **Navigate results** | `↑` / `↓` | `↑` / `↓` |
| **Open link (or switch to open tab)** | `↵ Enter` | `Enter` |
| **Open in new background tab** | `⌘` `↵` | `Ctrl` + `Enter` |
| **Reveal in Folder / Tab Group Explorer** | `⌘` `⇧` `L` | `Ctrl` + `Shift` + `L` |
| **Copy URL to clipboard** | `⌥` `C` | `Alt` + `C` |
| **Edit title / URL or Move to Folder** | `E` *(or `⌘E`)* | `E` *(or `Ctrl+E`)* |
| **Undo last move or deletion** | `⌘` `Z` | `Ctrl` + `Z` |
| **Back from Explorer / Clear / Close** | `Esc` | `Esc` |

> 💡 *Tip: You can customize the global launch shortcut anytime at `chrome://extensions/shortcuts`.*

---

## 🚀 Quick Start & Installation

### Option A — Chrome Web Store
Install directly from the **[Chrome Web Store](https://chromewebstore.google.com/detail/fadblajfeigpjfddhcmipinicihkdjon)** *(compatible with Google Chrome, Brave, Arc, Microsoft Edge, and Vivaldi)*.

### Option B — Build & Load Unpacked from Source

```bash
git clone https://github.com/rupeshdevbox/Pinpoint.git
cd Pinpoint
npm install
npm run build
```

This outputs validated extension bundles and release archives:
- **Chrome / Chromium MV3**: `dist/chrome/` & `releases/pinpoint-chrome-v1.0.0.zip`
- **Firefox MV3**: `dist/firefox/` & `releases/pinpoint-firefox-v1.0.0.zip`

**Load in Chrome / Brave / Arc / Edge:**
1. Open `chrome://extensions` and enable **Developer mode** (top-right).
2. Click **Load unpacked** and select `dist/chrome`.
3. Pin **Pinpoint** to your toolbar and press **`⌘⇧K`** / **`Ctrl+Shift+K`**.

**Load in Firefox:**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `dist/firefox/manifest.json`.

---

## 🛠️ Project Structure & Development

```text
Pinpoint/
├── public/icons/             # Supersampled 16/32/48/128 PNGs & vector brand SVG
├── src/
│   ├── adapters/             # Chrome + Firefox MV3 WebExtension adapter & preview mock workspace
│   ├── background/           # MV3 service worker (Side Panel behavior & cross-window tab focus)
│   ├── components/           # Command Palette, ResultCard, FolderExplorer, EditModal, DuplicateFinder
│   ├── constants/            # Brand config & official 9-color Chrome Tab Group palettes
│   ├── engine/               # URL canonicalizer, breadcrumb/tab-group indexer & fuzzy search engine
│   ├── manifest/             # Target-specific Chrome & Firefox Manifest V3 builder
│   └── styles/               # Semantic Light/Dark theme design tokens & Tailwind CSS v4
├── scripts/                  # Icon generator, multi-browser ZIP bundler & CWS API v2 publisher
├── store-assets/             # 1280×800 screenshots & promo tiles (24-bit RGB PNG)
└── tests/                    # Automated Vitest unit & integration test suites
```

```bash
npm run dev         # Launch interactive browser preview studio (Popup + Side Panel switcher)
npm run typecheck   # Run strict TypeScript compiler validation
npm test            # Run Vitest unit & integration test suites
npm run build       # Build Chrome & Firefox bundles + release .zip packages
```

---

## 🔒 Privacy

Pinpoint processes your bookmarks, open tabs, tab groups, and Reading List **strictly locally inside your browser**. No user data, URLs, or search queries are ever collected, transmitted, or shared. Read the full [Privacy Policy](./PRIVACY_POLICY.md).

