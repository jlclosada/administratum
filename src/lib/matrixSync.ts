import { createMatrix } from "@/db";
import { clearDraft, hasContent, loadDraft, type Matrix } from "@/lib/matrix";

let running: Promise<{ from: string; to: Matrix } | null> | null = null;

/**
 * After signing up or in, the matrix the visitor was building as a guest
 * moves into their account. Safe to call from several places: it runs once.
 */
export function importGuestDraft(): Promise<{ from: string; to: Matrix } | null> {
  if (running) return running;
  const draft = loadDraft();
  if (!draft) return Promise.resolve(null);
  clearDraft();
  if (!hasContent(draft)) return Promise.resolve(null);
  running = createMatrix(draft)
    .then((to) => ({ from: draft.id, to }))
    .catch(() => {
      // Keep it for another try rather than losing it.
      sessionStorage.setItem("adm-matrix-draft", JSON.stringify(draft));
      return null;
    })
    .finally(() => setTimeout(() => (running = null), 0));
  return running;
}
