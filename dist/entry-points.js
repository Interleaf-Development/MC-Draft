import { getCentreConfig } from './branch-config.js';

function entriesFor(pathname) {
  const config = getCentreConfig(pathname), base = config.basePath.replace(/\/$/, '') + '/';
  const entries = Object.fromEntries([['parent', '家長'], ['student', '學生']].map(([role, label]) => {
    const path = base + role + '/';
    return [role, { path, manifest: path + 'manifest.webmanifest', name: 'MathConcept ' + (base === '/' ? '' : config.centre.branchZh) + label, title: 'MathConcept（' + config.centre.branchZh + '）· ' + label }];
  }));
  return { base, entries, centre: config.centre };
}

export function roleFromUrl(url) {
  const pathRole = /^\/(?:hh\/)?(parent|student)(?:\/|\/index\.html)?$/.exec(url.pathname)?.[1];
  if (pathRole) return pathRole;
  const role = url.searchParams.get('role');
  return ['admin', 'teacher', 'parent', 'student'].includes(role) ? role : 'admin';
}

export function entryUrl(role, currentUrl) {
  const url = new URL(currentUrl);
  const { base, entries } = entriesFor(url.pathname);
  url.pathname = entries[role]?.path || base;
  url.searchParams.delete('role');
  if (role === 'teacher') url.searchParams.set('role', 'teacher');
  return url.pathname + url.search + url.hash;
}

// Keep the demo role switch, refresh URL and install metadata in agreement.
// Replacing history preserves in-memory drafts while switching demo views.
export function syncEntryPoint(role) {
  const { entries, centre } = entriesFor(window.location.pathname), entry = entries[role];
  const url = entryUrl(role, window.location.href);
  if (url !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(null, '', url);
  let manifest = document.querySelector('link[rel="manifest"]');
  if (entry) {
    if (!manifest) { manifest = document.createElement('link'); manifest.rel = 'manifest'; document.head.append(manifest); }
    if (manifest.getAttribute('href') !== entry.manifest) manifest.setAttribute('href', entry.manifest);
  } else manifest?.remove();
  for (const [name, content] of Object.entries({
    'apple-mobile-web-app-capable': entry ? 'yes' : null,
    'apple-mobile-web-app-status-bar-style': entry ? 'default' : null,
    'apple-mobile-web-app-title': entry?.name || null
  })) {
    let meta = document.querySelector('meta[name="' + name + '"]');
    if (!content) { meta?.remove(); continue; }
    if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.append(meta); }
    if (meta.content !== content) meta.content = content;
  }
  document.title = entry?.title || centre.name + ' · Demo';
}
