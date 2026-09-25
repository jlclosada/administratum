import { useSyncExternalStore } from 'react';

/** True while the CSS media query matches; re-renders when it changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches the breakpoint where AppLayout shows its right side rail (Tailwind `xl`). */
export const RIGHT_RAIL_QUERY = '(min-width: 1280px)';
