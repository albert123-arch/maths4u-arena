import { courseDirection } from './discovery-model';

export function localDestination(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return null;
  return value;
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
