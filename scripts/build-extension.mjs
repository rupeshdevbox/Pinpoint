import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { zipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function buildManifestObject(target) {
  const common = {
    manifest_version: 3,
    name: 'Pinpoint — Bookmark, Folder & Tab Search',
    short_name: 'Pinpoint',
    version: '1.0.0',
    description:
      'Instantly search saved bookmarks, nested folders, open tabs, Chrome tab groups, and Reading List — and reveal exact locations.',
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
          default: 'Ctrl+Shift+K',
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
      description:
        'Instantly search saved bookmarks, nested folders, open tabs, and history — and reveal exact saved folder locations.',
      commands: {
        _execute_action: {
          suggested_key: {
            default: 'Alt+Shift+K',
            mac: 'Command+Shift+K',
          },
          description: 'Open Pinpoint Bookmark & Tab Search',
        },
      },
      background: {
        scripts: ['service-worker.js'],
        type: 'module',
      },
      sidebar_action: {
        default_title: 'Pinpoint',
        default_panel: 'sidepanel.html',
        default_icon: 'icons/icon-32.png',
      },
      permissions: ['bookmarks', 'tabs', 'storage'],
      optional_permissions: ['history', 'sessions'],
      browser_specific_settings: {
        gecko: {
          id: 'pinpoint@rupeshdevbox.github.io',
          strict_min_version: '142.0',
          data_collection_permissions: {
            required: ['none'],
          },
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

function collectFilesForZip(baseDir, currentDir = baseDir, acc = {}) {
  for (const entry of readdirSync(currentDir)) {
    if (entry === '.DS_Store') continue;
    const fullPath = join(currentDir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFilesForZip(baseDir, fullPath, acc);
    } else {
      const relPath = relative(baseDir, fullPath).split('\\').join('/');
      acc[relPath] = new Uint8Array(readFileSync(fullPath));
    }
  }
  return acc;
}

function validateBuiltExtension(outDir, manifest) {
  if (manifest.name.length > 45) {
    throw new Error(`Manifest name exceeds 45 chars (${manifest.name.length})`);
  }
  if (manifest.description.length > 132) {
    throw new Error(
      `Manifest description exceeds 132 chars (${manifest.description.length})`
    );
  }

  const requiredFiles = [
    'manifest.json',
    'popup.html',
    'sidepanel.html',
    'service-worker.js',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
  ];

  for (const rel of requiredFiles) {
    const abs = resolve(outDir, rel);
    if (!existsSync(abs)) {
      throw new Error(`Missing required extension artifact: ${abs}`);
    }
  }
}

function collectSourceFilesForAmoZip(root) {
  const topLevelFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'popup.html',
    'sidepanel.html',
    'index.html',
    'store-studio.html',
    'README.md',
    'PRIVACY_POLICY.md',
    'BUILD_INSTRUCTIONS_AMO.md',
  ];
  const includeDirs = ['public', 'scripts', 'src', 'tests'];
  const entries = {};

  for (const rel of topLevelFiles) {
    const abs = resolve(root, rel);
    if (existsSync(abs)) {
      entries[rel] = new Uint8Array(readFileSync(abs));
    }
  }

  for (const dir of includeDirs) {
    const absDir = resolve(root, dir);
    if (existsSync(absDir)) {
      const subEntries = collectFilesForZip(absDir);
      for (const [subPath, bytes] of Object.entries(subEntries)) {
        entries[`${dir}/${subPath}`] = bytes;
      }
    }
  }

  return entries;
}

async function buildTarget(target) {
  const outDir = resolve(rootDir, 'dist', target);
  console.log(`\nBuilding ${target.toUpperCase()} Manifest V3 bundle -> dist/${target}...`);

  await build({
    root: rootDir,
    configFile: false,
    plugins: [react(), tailwindcss()],
    base: './',
    publicDir: resolve(rootDir, 'public'),
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'popup.html'),
          sidepanel: resolve(rootDir, 'sidepanel.html'),
          'service-worker': resolve(rootDir, 'src/background/service-worker.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) =>
            chunkInfo.name === 'service-worker'
              ? 'service-worker.js'
              : 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  });

  const manifest = buildManifestObject(target);
  writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  validateBuiltExtension(outDir, manifest);

  const releasesDir = resolve(rootDir, 'releases');
  mkdirSync(releasesDir, { recursive: true });
  const zipPath = resolve(releasesDir, `pinpoint-${target}-v${manifest.version}.zip`);
  const zipEntries = collectFilesForZip(outDir);
  const zipped = zipSync(zipEntries, { level: 9 });
  writeFileSync(zipPath, Buffer.from(zipped));

  console.log(
    `✓ ${target.toUpperCase()} package ready: releases/pinpoint-${target}-v${manifest.version}.zip (${(
      zipped.byteLength / 1024
    ).toFixed(1)} KB)`
  );

  if (target === 'firefox') {
    const sourceZipPath = resolve(
      releasesDir,
      `pinpoint-firefox-source-v${manifest.version}.zip`
    );
    const sourceEntries = collectSourceFilesForAmoZip(rootDir);
    const sourceZipped = zipSync(sourceEntries, { level: 9 });
    writeFileSync(sourceZipPath, Buffer.from(sourceZipped));
    console.log(
      `✓ FIREFOX AMO source archive ready: releases/pinpoint-firefox-source-v${manifest.version}.zip (${(
        sourceZipped.byteLength / 1024
      ).toFixed(1)} KB)`
    );
  }
}

async function main() {
  // Ensure fresh icons
  execFileSync(process.execPath, [resolve(__dirname, 'generate-icons.mjs')], {
    stdio: 'inherit',
  });

  const arg = process.argv.find((a) => a.startsWith('--target='));
  const targetArg = arg ? arg.split('=')[1] : 'all';
  const targets = targetArg === 'all' ? ['chrome', 'firefox'] : [targetArg];

  for (const target of targets) {
    if (target !== 'chrome' && target !== 'firefox') {
      throw new Error(`Unsupported build target "${target}". Expected chrome, firefox, or all.`);
    }
    await buildTarget(target);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
