import { roleFromUrl, entryUrl } from './entry-points.js';

export const DEMO_PAGES = Object.freeze({
  admin: Object.freeze(['schedule', 'students', 'billing', 'messages']),
  teacher: Object.freeze(['progress', 'classroom', 'schedule', 'notes', 'messages']),
  parent: Object.freeze(['overview', 'lessons', 'handbook', 'homework', 'payments', 'messages']),
  student: Object.freeze(['work', 'past', 'future'])
});

// Storage is resolved lazily so a proposal never even accesses localStorage.
// Same-origin frames in one proposal tab share sessionStorage; other tabs and
// the ordinary application retain their own data and lifetime.
export function createDemoContext({ url, getLocalStorage, getSessionStorage }) {
  const isProposal = url.searchParams.get('proposal') === '1';
  const keyFor = key => isProposal ? 'mathconcept-proposal-v1:' + key : key;
  const storageFor = () => isProposal ? getSessionStorage() : getLocalStorage();
  return {
    isProposal,
    isPreloading: isProposal && url.searchParams.get('proposalPreload') === '1',
    keyFor,
    storage: {
      getItem(key) { return storageFor().getItem(keyFor(key)); },
      setItem(key, value) { storageFor().setItem(keyFor(key), value); }
    }
  };
}

export function validateDemoNavigation(value, studentIds) {
  if (!value || typeof value !== 'object' || !Object.hasOwn(DEMO_PAGES, value.role)) return null;
  const page = value.page === undefined ? DEMO_PAGES[value.role][0] : value.page;
  if (!DEMO_PAGES[value.role].includes(page)) return null;
  if (value.studentId !== undefined && !studentIds.includes(value.studentId)) return null;
  return { role: value.role, page, ...(value.studentId === undefined ? {} : { studentId: value.studentId }) };
}

export function demoNavigationFromUrl(url, studentIds) {
  const role = roleFromUrl(url);
  const page = url.searchParams.get('page');
  const studentId = url.searchParams.get('studentId');
  return {
    role,
    page: DEMO_PAGES[role].includes(page) ? page : DEMO_PAGES[role][0],
    ...(studentIds.includes(studentId) ? { studentId } : {})
  };
}

export function proposalEntryUrl(role, page, currentUrl, studentId) {
  const url = new URL(entryUrl(role, currentUrl), currentUrl);
  url.searchParams.set('proposal', '1');
  url.searchParams.set('page', DEMO_PAGES[role]?.includes(page) ? page : DEMO_PAGES[role]?.[0] || 'schedule');
  if (url.searchParams.has('studentId')) {
    if (studentId) url.searchParams.set('studentId', studentId);
    else url.searchParams.delete('studentId');
  }
  return entryUrl(role, url);
}

export function proposalMessage(event, { isProposal, parent, self, origin, studentIds }) {
  if (!isProposal || parent === self || event.source !== parent || event.origin !== origin) return null;
  if (event.data?.type === 'mc-proposal:refresh') return { type: 'refresh' };
  if (event.data?.type === 'mc-proposal:activate') return { type: 'activate' };
  if (event.data?.type === 'mc-proposal:deactivate') return { type: 'deactivate' };
  if (event.data?.type !== 'mc-proposal:navigate') return null;
  const navigation = validateDemoNavigation(event.data, studentIds);
  return navigation ? { type: 'navigate', ...navigation } : null;
}
