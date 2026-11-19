import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
const zipPath = resolve(rootDir, `releases/pinpoint-chrome-v${pkg.version}.zip`);

const requiredAssets = [
  zipPath,
  resolve(rootDir, 'store-assets/store-icon-128x128.png'),
  resolve(rootDir, 'store-assets/promo-small-440x280.png'),
  resolve(rootDir, 'store-assets/promo-marquee-1400x560.png'),
  resolve(rootDir, 'store-assets/screenshots/01-instant-search-and-tab-groups.png'),
  resolve(rootDir, 'store-assets/screenshots/02-reveal-in-folder-explorer.png'),
  resolve(rootDir, 'store-assets/screenshots/03-quick-organize-and-move-folders.png'),
  resolve(rootDir, 'store-assets/screenshots/04-duplicate-bookmark-finder.png'),
  resolve(rootDir, 'store-assets/screenshots/05-light-theme-and-side-panel.png'),
];

function runPreflight() {
  console.log('Pinpoint — Chrome Web Store Preflight Check\n');
  for (const file of requiredAssets) {
    if (!existsSync(file)) {
      throw new Error(`Missing required submission file: ${file}. Run "npm run build" first.`);
    }
    const kb = (statSync(file).size / 1024).toFixed(1);
    console.log(`  ✓ ${file.replace(rootDir + '/', '')} (${kb} KB)`);
  }
  console.log('\nAll Chrome Web Store bundle & graphic assets verified.\n');
}

async function exchangeAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function uploadAndPublish() {
  runPreflight();

  if (process.argv.includes('--dry-run')) {
    console.log('Dry-run complete. Ready for Chrome Web Store upload.');
    return;
  }

  const publisherId = process.env.CWS_PUBLISHER_ID;
  const extensionId = process.env.CWS_EXTENSION_ID;
  const clientId = process.env.CWS_CLIENT_ID;
  const clientSecret = process.env.CWS_CLIENT_SECRET;
  const refreshToken = process.env.CWS_REFRESH_TOKEN;

  if (!publisherId || !extensionId || !clientId || !clientSecret || !refreshToken) {
    console.log('Chrome Web Store API v2 credentials not detected in environment.');
    console.log(
      'Note: Google requires first-time extensions to be created once in the Developer Console:'
    );
    console.log('  1. Open https://chrome.google.com/webstore/devconsole');
    console.log(`  2. Click "+ New Item" and upload: releases/pinpoint-chrome-v${pkg.version}.zip`);
    console.log('  3. Upload screenshots & promo tiles from: store-assets/');
    console.log('  4. Paste copy & permission justifications from: STORE_LISTING.md\n');
    console.log('For automated CLI updates via Chrome Web Store API v2, set:');
    console.log(
      '  CWS_PUBLISHER_ID, CWS_EXTENSION_ID, CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN'
    );
    console.log('and run: npm run publish:chrome -- --submit');
    return;
  }

  console.log('Authenticating with Google OAuth2 for Chrome Web Store API v2...');
  const accessToken = await exchangeAccessToken({ clientId, clientSecret, refreshToken });

  const zipBytes = readFileSync(zipPath);
  const uploadUrl = `https://chromewebstore.googleapis.com/upload/v2/publishers/${encodeURIComponent(
    publisherId
  )}/items/${encodeURIComponent(extensionId)}:upload`;

  console.log(`Uploading releases/pinpoint-chrome-v${pkg.version}.zip...`);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/zip',
    },
    body: zipBytes,
  });

  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || uploadJson.uploadState === 'FAILED') {
    throw new Error(`CWS upload failed: ${JSON.stringify(uploadJson, null, 2)}`);
  }

  // Poll status if async processing is still running
  let state = uploadJson.uploadState;
  const statusUrl = `https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(
    publisherId
  )}/items/${encodeURIComponent(extensionId)}:fetchStatus`;

  let attempts = 0;
  while (state === 'IN_PROGRESS' && attempts < 15) {
    await new Promise((r) => setTimeout(r, 2000));
    const stRes = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const stJson = await stRes.json();
    state = stJson.lastAsyncUploadState ?? state;
    attempts++;
  }

  console.log(`✓ Upload succeeded (state: ${state}).`);

  if (process.argv.includes('--submit')) {
    const publishUrl = `https://chromewebstore.googleapis.com/v2/publishers/${encodeURIComponent(
      publisherId
    )}/items/${encodeURIComponent(extensionId)}:publish`;
    console.log('Submitting item for Chrome Web Store review...');
    const pubRes = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
    });
    const pubJson = await pubRes.json();
    if (!pubRes.ok) {
      throw new Error(`CWS publish submission failed: ${JSON.stringify(pubJson, null, 2)}`);
    }
    console.log(`✓ Submitted to Chrome Web Store! State: ${pubJson.state}`);
  } else {
    console.log(
      'Uploaded as draft. Pass "--submit" (npm run publish:chrome -- --submit) to submit for review.'
    );
  }
}

uploadAndPublish().catch((err) => {
  console.error(err);
  process.exit(1);
});
