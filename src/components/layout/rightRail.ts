import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * Lets a page place content in the right side rail, under "Mi espacio", on
 * wide screens.
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
