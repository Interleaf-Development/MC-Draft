// Bump this version when changing the offline asset set or cache policy.
const CACHE_PREFIX = 'mathconcept-static-';
const CACHE_NAME = CACHE_PREFIX + 'v38-payment-acknowledgements';
const shells = { '/index.html': '/', '/parent/index.html': '/parent/', '/student/index.html': '/student/', '/hh/index.html': '/hh/', '/hh/parent/index.html': '/hh/parent/', '/hh/student/index.html': '/hh/student/' };
function shellPath(path) {
  if (path === '/' || path === '/index.html') return '/index.html';
  if (path === '/hh' || path === '/hh/' || path === '/hh/index.html') return '/hh/index.html';
  const family = /^\/(hh\/)?(parent|student)(?:\/|\/index\.html)?$/.exec(path);
  return family ? '/' + (family[1] || '') + family[2] + '/index.html' : null;
}
const PRECACHE = [
  ...Object.keys(shells), '/entry-points.js', '/branch-config.js',
  '/p6-curriculum.js', '/p3-curriculum.js', '/teacher-progress.js', '/teacher-progress-ui.js', '/teacher-progress.css',
  '/app.js', '/model.js', '/checkin.js', '/student-profile.js', '/family-locale.js', '/schedule-drag.js',
  '/conversations.js', '/conversations-ui.js', '/chat-seed-locale.js',
  '/billing-automation.js', '/billing-proof-ui.js', '/bank-check-ui.js', '/receipts-ui.js', '/receipt-document.js', '/regular-schedule.js', '/regular-schedule-ui.js', '/statement-csv.js',
  '/vendor/qrcode.js', '/pwa.js',
  '/styles.css', '/scale.css', '/schedule.css', '/student-directory.css',
  '/conversations.css', '/billing-automation.css', '/receipts.css', '/parent-home.css', '/conversation-wallpaper.svg',
  '/brand/mathconcept-logo.png', '/parent/manifest.webmanifest', '/student/manifest.webmanifest', '/hh/parent/manifest.webmanifest', '/hh/student/manifest.webmanifest', '/icons/mathconcept-192.png', '/icons/mathconcept-512.png', '/icons/mathconcept-apple-touch.png', '/icons/mathconcept-favicon.png',
  ...Array.from({ length: 18 }, (_, index) => '/brand/Asset%20' + (index + 1) + '.svg')
];
const staticPaths = new Set(PRECACHE);

function cachePath(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return null;
  if (request.mode === 'navigate') return shellPath(url.pathname);
  // A strict asset allowlist excludes proofs, API data, auth routes and arbitrary URLs.
  return staticPaths.has(url.pathname) || /^\/brand\/Asset%20(?:[1-9]|1[0-8])\.svg$/.test(url.pathname) ? url.pathname : null;
}

async function safeToCache(response, path) {
  if (!response.ok || response.redirected || response.type !== 'basic') return false;
  const url = new URL(response.url);
  if (url.origin !== self.location.origin || (url.pathname !== path && !(shells[path] && shellPath(url.pathname) === path))) return false;
  const contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (path.endsWith('.js')) return ['text/javascript', 'application/javascript'].includes(contentType);
  if (path.endsWith('.css')) return contentType === 'text/css';
  if (path.endsWith('.png')) return contentType === 'image/png';
  if (path.endsWith('.svg')) return contentType === 'image/svg+xml';
  if (path.endsWith('.webmanifest')) return ['application/manifest+json', 'application/json'].includes(contentType);
  if (shells[path] && contentType === 'text/html') {
    // A protection page can return 200 HTML. Cache only the known app shell.
    const html = await response.clone().text();
    const expectedManifest = /\/(parent|student)\/index\.html$/.test(path) ? shells[path] + 'manifest.webmanifest' : null;
    return html.includes('<div id="app"></div>') && html.includes('src="/app.js"') && (expectedManifest ? html.includes('href="' + expectedManifest + '"') : !html.includes('rel="manifest"'));
  }
  return false;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Validate every asset before writing a complete offline shell.
    const entries = await Promise.all(PRECACHE.map(async path => {
      const response = await fetch(shells[path] || path, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!await safeToCache(response, path)) throw new Error('Offline asset unavailable: ' + path);
      return [path, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(entries.map(([path, response]) => cache.put(path, response)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, path) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    // Each family entry keeps its own install metadata, including when offline.
    if (await safeToCache(response, path)) await cache.put(path, response.clone()).catch(() => {});
    // Temporary server errors can use the shell; auth errors/redirects stay authoritative.
    if (response.status >= 500) return await cache.match(path) || response;
    return response;
  } catch (error) {
    const cached = await cache.match(path);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const path = cachePath(event.request);
  if (path) event.respondWith(networkFirst(event.request, path));
});
