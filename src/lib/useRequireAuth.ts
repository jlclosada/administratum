import { useAuthStore } from "@/stores";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Wraps an action that needs an account. Guests get the sign-up screen
 * (over the current page) instead of a failing request.
 *
 *   const requireAuth = useRequireAuth();
 *   <button onClick={requireAuth(() => like(post), "dar me gusta")} />
 */
export function useRequireAuth() {
  const signedIn = useAuthStore((s) => !!s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  return useCallback(
    <A extends unknown[]>(action: (...args: A) => unknown, what = "hacer esto") =>
      (...args: A) => {
        if (signedIn) return action(...args);
        toast(`Crea una cuenta gratis o inicia sesión para ${what}.`);
        openAuth("signup");
      },
    [signedIn, openAuth],
  );
}
