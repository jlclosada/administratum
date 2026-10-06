import { supabase } from "@/lib/supabase";

/** Calls the /api/email Vercel function with the signed-in user's session. */
export async function emailApi<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

/** Emails all subscribed users about a published article (template "noticia"). */
export function announceArticle(articleId: string) {
  return emailApi<{ sent: number; recipients: number; already: number; remaining: number; limited: boolean }>({
    action: "send",
    template: "noticia",
    articleId,
    audience: { type: "all" },
  });
}
