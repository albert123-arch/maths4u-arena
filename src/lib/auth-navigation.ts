import { courseDirection } from './discovery-model';

function isAuthPath(path: string) { return /^\/(?:login|register|recover)(?:\/|$)/.test(path); }

export function localDestination(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return null;
  const origin = 'https://arena.invalid';
  const url = new URL(value, origin);
  if (url.origin !== origin || isAuthPath(url.pathname)) return null;
  return value;
}

export function authReturnAt({ pathname, search, hash }: Pick<Location, 'pathname' | 'search' | 'hash'>) {
  if (isAuthPath(pathname)) return localDestination(new URLSearchParams(search).get('next'));
  const destination = pathname + search + hash;
  return destination === '/' ? null : localDestination(destination);
}

export function courseContext(path: string | null) {
  const parts = (localDestination(path) ?? '').split(/[?#]/)[0].replace(/^\/ru(?=\/)/, '').split('/');
  if (parts[1] === 'courses' && parts[2]) return { direction: courseDirection(parts[2]), courseSlug: parts[2] };
  if (parts[1] === 'learn' && parts[2]) return { direction: parts[2] };
  return null;
}

export function authHref(mode: 'login' | 'register', next?: string | null) {
  const path = localDestination(next);
  return path ? `/${mode}?next=${encodeURIComponent(path)}` : `/${mode}`;
}

export function afterSigningIn(home: string, next: string | null, register: boolean) {
  const path = localDestination(next);
  // A plain course or level link is the entry to choosing dashboard courses.
  // A specific lesson, chapter or activity is a destination to resume.
  if (register && path && /^\/(?:ru\/)?(?:courses|learn)\/[^/?#]+\/?$/.test(path)) return home;
  return path ?? home;
}
