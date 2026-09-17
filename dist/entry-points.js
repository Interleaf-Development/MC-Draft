const familyEntries = {
  parent: { path: '/parent/', manifest: '/parent/manifest.webmanifest', name: 'MathConcept 家長', title: 'MathConcept（荃灣）· 家長' },
  student: { path: '/student/', manifest: '/student/manifest.webmanifest', name: 'MathConcept 學生', title: 'MathConcept（荃灣）· 學生' }
};

export function roleFromUrl(url) {
  const pathRole = /^\/(parent|student)(?:\/|\/index\.html)?$/.exec(url.pathname)?.[1];
  if (pathRole) return pathRole;
  const role = url.searchParams.get('role');
  return ['admin', 'teacher', 'parent', 'student'].includes(role) ? role : 'admin';
}

export function entryUrl(role, currentUrl) {
  const url = new URL(currentUrl);
  url.pathname = familyEntries[role]?.path || '/';
  url.searchParams.delete('role');
  if (role === 'teacher') url.searchParams.set('role', 'teacher');
  return url.pathname + url.search + url.hash;
}

// Keep the demo role switch, refresh URL and install metadata in agreement.
// Replacing history preserves in-memory drafts while switching demo views.
export function syncEntryPoint(role) {
  const entry = familyEntries[role];
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
  document.title = entry?.title || 'MathConcept (Tsuen Wan) · Demo';
}
