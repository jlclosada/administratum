import { describe, expect, it } from "vitest";
import { buildPointsPost, type PostChange } from "./redditPost";

const changes: PostChange[] = [
  { unit: "Lion El'Jonson", faction: "Dark Angels", factionEs: "Ángeles Oscuros", before: 265, after: 415, delta: 150 },
  { unit: "Rubric Marines", faction: "Thousand Sons", factionEs: "Mil Hijos", before: 100, after: 115, delta: 15 },
  { unit: "Desolation Squad", faction: "Dark Angels", factionEs: "Ángeles Oscuros", before: 180, after: 135, delta: -45 },
];

describe("buildPointsPost", () => {
  it("writes a Spanish post with tables, faction counts and the link", () => {
    const { title, body } = buildPointsPost(changes, "2026-09-30", "1.5", "es");
    expect(title).toBe("Cambios de puntos de Warhammer 40K (MFM 1.5): 3 unidades, 2 suben y 1 bajan");
    expect(body).toContain("| Lion El'Jonson | Ángeles Oscuros | 265 | 415 | +150 |");
    expect(body).toContain("| Desolation Squad | Ángeles Oscuros | 180 | 135 | -45 |");
    expect(body).toContain("- **Ángeles Oscuros**: ▲ 1 · ▼ 1");
    expect(body).toContain("https://administratum.site/cambios-puntos");
    expect(body.indexOf("Mayores subidas")).toBeLessThan(body.indexOf("Mayores bajadas"));
  });

  it("uses the official English names in the English version", () => {
    const { title, body } = buildPointsPost(changes, "2026-09-30", null, "en");
    expect(title).toBe("Warhammer 40K points changes: 3 units, 2 up and 1 down");
    expect(body).toContain("| Rubric Marines | Thousand Sons | 100 | 115 | +15 |");
    expect(body).not.toContain("Mil Hijos");
  });
});
