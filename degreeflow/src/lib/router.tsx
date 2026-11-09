import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from 'react';

/**
 * A tiny hash router: deep links work on any static host without server rewrites,
 * and the browser back button behaves as expected.
 */

// The current route lives in memory and is mirrored to the URL hash when the host allows it.
// That keeps navigation working inside sandboxed embeds where hash writes may be ignored.
const readHash = () => window.location.hash.replace(/^#/, '');
let current = readHash().startsWith('/') ? readHash() : '/';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const h = readHash();
    // Ignore hashes that aren't routes (e.g. rewritten or cleared by an embedding host).
    if (h.startsWith('/') && h !== current) {
      current = h;
      emit();
    }
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useRoute() {
  const raw = useSyncExternalStore(subscribe, () => current, () => '/');
  const [path, query = ''] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query), href: raw };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === current) return;
  current = to;
  emit();
  try {
    if (opts.replace) window.history.replaceState(null, '', `#${to}`);
    else window.location.hash = to;
  } catch {
    /* the route still changes in memory */
  }
}

/** Update query params on the current path without adding a history entry. */
export function setParams(path: string, params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const q = sp.toString();
  navigate(q ? `${path}?${q}` : path, { replace: true });
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={`#${to}`} onClick={handle} {...rest} />;
}
