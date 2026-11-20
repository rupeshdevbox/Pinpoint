import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function loadDotEnvIfPresent() {
  const envPath = resolve(rootDir, '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = rawVal;
    }
  }
}

loadDotEnvIfPresent();

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
const xpiZipPath = resolve(rootDir, `releases/pinpoint-firefox-v${pkg.version}.zip`);
const sourceZipPath = resolve(rootDir, `releases/pinpoint-firefox-source-v${pkg.version}.zip`);
const manifestPath = resolve(rootDir, 'dist/firefox/manifest.json');

const requiredFiles = [
  xpiZipPath,
  sourceZipPath,
  manifestPath,
  resolve(rootDir, 'store-assets/store-icon-128x128.png'),
  resolve(rootDir, 'store-assets/screenshots/01-instant-search-and-tab-groups.png'),
  resolve(rootDir, 'store-assets/screenshots/02-reveal-in-folder-explorer.png'),
  resolve(rootDir, 'store-assets/screenshots/03-quick-organize-and-move-folders.png'),
  resolve(rootDir, 'store-assets/screenshots/04-duplicate-bookmark-finder.png'),
  resolve(rootDir, 'store-assets/screenshots/05-light-theme-and-side-panel.png'),
];

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createAmoJwt(issuer, secret) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: issuer,
    jti: randomUUID(),
    iat: issuedAt,
    exp: issuedAt + 180,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function runPreflight() {
  console.log('Pinpoint — Firefox Add-ons (AMO) Preflight Check\n');
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      throw new Error(`Missing required AMO artifact: ${file}. Run "npm run build" first.`);
    }
    const kb = (statSync(file).size / 1024).toFixed(1);
    console.log(`  ✓ ${file.replace(rootDir + '/', '')} (${kb} KB)`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const gecko = manifest?.browser_specific_settings?.gecko;
  if (!gecko?.id) {
    throw new Error('Firefox manifest missing browser_specific_settings.gecko.id');
  }
  if (!Array.isArray(gecko?.data_collection_permissions?.required)) {
    throw new Error(
      'Firefox manifest missing mandatory browser_specific_settings.gecko.data_collection_permissions.required'
    );
  }
  console.log(`  ✓ Gecko Add-on ID: ${gecko.id}`);
  console.log(
    `  ✓ Data Collection Permissions: ${JSON.stringify(gecko.data_collection_permissions)}`
  );
  console.log('\nAll Firefox Add-ons (AMO) packages, source code archive & screenshots verified.\n');
}

async function amoFetch(path, { issuer, secret, method = 'GET', body, headers = {} }) {
  const token = createAmoJwt(issuer, secret);
  const res = await fetch(`https://addons.mozilla.org/api/v5${path}`, {
    method,
    headers: {
      Authorization: `JWT ${token}`,
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`AMO API ${method} ${path} failed (${res.status}): ${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

async function main() {
  runPreflight();

  if (process.argv.includes('--dry-run')) {
    console.log('Dry-run complete. Ready for Mozilla Add-ons (AMO) submission.');
    return;
  }

  const issuer = process.env.AMO_JWT_ISSUER;
  const secret = process.env.AMO_JWT_SECRET;

  if (!issuer || !secret) {
    console.log('Mozilla AMO API credentials (AMO_JWT_ISSUER / AMO_JWT_SECRET) not detected in .env.');
    console.log('\nYou can publish Pinpoint to Firefox Add-ons in either of two ways:\n');
    console.log('Option A — Browser Upload (addons.mozilla.org Developer Hub):');
    console.log('  1. Sign in at: https://addons.mozilla.org/en-US/developers/addon/submit/distribution');
    console.log('  2. Select "On this site" (Listed on Firefox Add-ons) -> Continue');
    console.log(`  3. Upload extension bundle: releases/pinpoint-firefox-v${pkg.version}.zip`);
    console.log(`  4. When asked for Source Code, select "Yes" and upload: releases/pinpoint-firefox-source-v${pkg.version}.zip`);
    console.log('  5. Paste Reviewer Notes & Listing Details from: FIREFOX_AMO_LISTING.md\n');
    console.log('Option B — 1-Command Automated CLI Publish:');
    console.log('  1. Generate API keys at: https://addons.mozilla.org/en-US/developers/addon/api/key/');
    console.log('  2. Add AMO_JWT_ISSUER=... and AMO_JWT_SECRET=... to .env');
    console.log('  3. Run: npm run publish:firefox');
    return;
  }

  console.log('1/3 Uploading Firefox extension package to AMO...');
  const uploadForm = new FormData();
  uploadForm.append(
    'upload',
    new Blob([readFileSync(xpiZipPath)], { type: 'application/zip' }),
    `pinpoint-firefox-v${pkg.version}.zip`
  );
  uploadForm.append('channel', 'listed');

  let uploadDetail = await amoFetch('/addons/upload/', {
    issuer,
    secret,
    method: 'POST',
    body: uploadForm,
  });

  console.log(`  Upload UUID: ${uploadDetail.uuid} — waiting for AMO validation...`);
  let polls = 0;
  while (!uploadDetail.processed && polls < 30) {
    await new Promise((r) => setTimeout(r, 3000));
    uploadDetail = await amoFetch(`/addons/upload/${uploadDetail.uuid}/`, {
      issuer,
      secret,
    });
    polls++;
  }

  if (!uploadDetail.valid) {
    throw new Error(
      `AMO validation rejected upload: ${JSON.stringify(uploadDetail.validation, null, 2)}`
    );
  }
  console.log('  ✓ AMO automated validation passed!');

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const addonId = manifest.browser_specific_settings.gecko.id;

  // Check if add-on already exists on AMO
  let addonExists = false;
  try {
    await amoFetch(`/addons/addon/${encodeURIComponent(addonId)}/`, { issuer, secret });
    addonExists = true;
  } catch {
    addonExists = false;
  }

  const approvalNotes = readFileSync(resolve(rootDir, 'BUILD_INSTRUCTIONS_AMO.md'), 'utf8');

  if (!addonExists) {
    console.log('2/3 Creating new Listed Add-on on addons.mozilla.org...');
    const createPayload = {
      version: {
        upload: uploadDetail.uuid,
        license: 'MIT',
        approval_notes: approvalNotes,
      },
      categories: {
        firefox: ['bookmarks', 'tabs'],
      },
      summary: {
        'en-US':
          'Instantly search saved bookmarks, nested folders, open tabs, and history — and reveal exact saved folder locations.',
      },
      description: {
        'en-US':
          'Pinpoint is a fast, keyboard-first Command Palette (Cmd+Shift+K / Alt+Shift+K) and Firefox Sidebar that finds any saved URL in milliseconds and reveals the exact Bookmark Folder where it lives.\n\n• Full Interactive Folder Breadcrumbs on every search result\n• Reveal in Folder Explorer (inspect sibling bookmarks with your matched link highlighted)\n• Smart Bookmark ↔ Open Tab Correlation (switch straight to open tabs instead of opening duplicates)\n• Power Search Operators (in:folder, site:domain.com, is:open, is:duplicate)\n• Quick Edit, Move-to-Folder, Subfolder Creation & Duplicate Cleanup with 1-click Undo\n• 100% Local & Private — zero external servers, zero telemetry, zero <all_urls> host permissions.',
      },
      slug: 'pinpoint-bookmark-tab-search',
      homepage: {
        'en-US': 'https://github.com/rupeshdevbox/Pinpoint',
      },
      support_url: {
        'en-US': 'https://github.com/rupeshdevbox/Pinpoint/issues',
      },
      has_privacy_policy: true,
      privacy_policy: {
        'en-US': readFileSync(resolve(rootDir, 'PRIVACY_POLICY.md'), 'utf8'),
      },
    };

    const created = await amoFetch('/addons/addon/', {
      issuer,
      secret,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });

    const versionId = created?.current_version?.id;
    if (versionId) {
      console.log('3/3 Attaching clean source code archive for AMO reviewers...');
      const srcForm = new FormData();
      srcForm.append(
        'source',
        new Blob([readFileSync(sourceZipPath)], { type: 'application/zip' }),
        `pinpoint-firefox-source-v${pkg.version}.zip`
      );
      await amoFetch(
        `/addons/addon/${encodeURIComponent(addonId)}/versions/${versionId}/`,
        {
          issuer,
          secret,
          method: 'PATCH',
          body: srcForm,
        }
      );
    }
    console.log(`\n✓ Submitted to Firefox Add-ons! URL: ${created.url || 'https://addons.mozilla.org/en-US/developers/addons'}`);
  } else {
    console.log(`2/3 Submitting new version v${pkg.version} for existing AMO add-on (${addonId})...`);
    const verForm = new FormData();
    verForm.append('upload', uploadDetail.uuid);
    verForm.append(
      'source',
      new Blob([readFileSync(sourceZipPath)], { type: 'application/zip' }),
      `pinpoint-firefox-source-v${pkg.version}.zip`
    );
    verForm.append('approval_notes', approvalNotes);
    const ver = await amoFetch(`/addons/addon/${encodeURIComponent(addonId)}/versions/`, {
      issuer,
      secret,
      method: 'POST',
      body: verForm,
    });
    console.log(`\n✓ Version v${pkg.version} submitted to Firefox Add-ons (Version ID: ${ver.id})!`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
