import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * Lets a page place content at the top of the right side rail (above the
 * ads) on wide screens — e.g. the home page's "Miniatura del mes".
 * `node` must be memoized by the caller: a fresh element on every render
 * would re-set layout state on every render and loop.
 */
export const RightRailContext = createContext<(node: ReactNode) => void>(() => {});

export function useRightRail(node: ReactNode, enabled: boolean) {
  const set = useContext(RightRailContext);
  useEffect(() => {
    if (!enabled) return;
    set(node);
    return () => set(null);
  }, [set, node, enabled]);
}
