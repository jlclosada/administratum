/**
 * Pulls addresses out of pasted text: one per line, commas, semicolons, an
 * Excel column or "Name <a@b.c>". Lower-cased and de-duplicated; the
 * database does the real validation.
 */
export function parseEmails(text: string): string[] {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.replace(/^[<("']+|[>)"'.]+$/g, "").toLowerCase())
    .filter((p) => p.includes("@"));
  return [...new Set(parts)];
}
