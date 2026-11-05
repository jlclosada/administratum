import { playerLabel, SCORE_LABEL, type Matrix, type Score } from "@/lib/matrix";
import { cn } from "@/lib/utils";
import { factionImage, type FactionOption } from "./factions";
import { SCORE_SOFT, SCORE_SOLID, SCORES, solidFor } from "./scoreStyle";

/** Round faction artwork, or the initials when there is none. */
export function FactionAvatar({ factions, faction, className }: { factions: FactionOption[]; faction: string; className?: string }) {
  const image = factionImage(factions, faction);
  const initials = faction
    .split(/[\s']+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return image ? (
    <img src={image} alt="" loading="lazy" className={cn("h-9 w-9 shrink-0 rounded-full border border-border/60 object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card font-mono text-[10px] text-muted-foreground",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

/** The five 1–5 buttons, big enough for thumbs. */
export function ScoreButtons({ value, onChange, label }: { value: Score | null; onChange: (s: Score) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {SCORES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${s}: ${SCORE_LABEL[s]}`}
            title={SCORE_LABEL[s]}
            onClick={() => onChange(s)}
            className={cn(
              "h-12 rounded-xl border font-display text-lg font-black tabular-nums transition-all duration-150 active:scale-95",
              active ? cn(SCORE_SOLID[s], "border-transparent shadow-lg ring-2 ring-white/70") : cn("bg-background/40 hover:bg-accent", SCORE_SOFT[s], value !== null && "opacity-60"),
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

/** A colour key for the 1–5 scale. */
export function ScoreLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground", className)}>
      {SCORES.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold", SCORE_SOLID[s])}>{s}</span>
          {SCORE_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

/**
 * The heat map: our players as rows, rival lists as columns, with row and
 * column averages. Optionally clickable and with some cells ringed (the
 * ideal line-up).
 */
export function MatrixGrid({
  matrix,
  factions,
  highlight,
  activeRow,
  onCell,
  className,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  /** highlight[i] = rival column to ring on row i. */
  highlight?: number[];
  activeRow?: number;
  onCell?: (i: number, j: number) => void;
  className?: string;
}) {
  const n = matrix.ours.length;
  const colAvg = (j: number) => {
    const v = matrix.scores.map((r) => r[j]).filter((s): s is Score => s != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const rowAvg = (i: number) => {
    const v = (matrix.scores[i] ?? []).filter((s): s is Score => s != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const avgCell = (v: number | null) => (
    <span className={cn("flex h-full w-full items-center justify-center rounded-md text-[11px] font-semibold tabular-nums", v === null ? "text-muted-foreground/50" : cn(solidFor(v), "opacity-70"))}>
      {v === null ? "–" : v.toFixed(1)}
    </span>
  );

  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <table className="w-full min-w-max border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background/95 p-1 text-left align-bottom font-mono text-[10px] font-normal uppercase leading-tight tracking-wider text-muted-foreground backdrop-blur">
              <span className="block max-w-[6rem] truncate sm:max-w-[9rem]">{matrix.ourTeam || "Tu equipo"} ↓</span>
              <span className="block max-w-[6rem] truncate sm:max-w-[9rem]">{matrix.rivalTeam || "Rival"} →</span>
            </th>
            {matrix.theirs.map((p, j) => (
              <th key={j} scope="col" className="w-9 p-0 align-bottom font-normal sm:w-12">
                <div className="flex flex-col items-center gap-1" title={`${playerLabel(p, j, "theirs")} · ${p.faction}`}>
                  <FactionAvatar factions={factions} faction={p.faction} className="h-7 w-7 sm:h-8 sm:w-8" />
                  <span className="block max-w-[2.5rem] truncate text-[10px] text-muted-foreground sm:max-w-[3.25rem]">{playerLabel(p, j, "theirs")}</span>
                </div>
              </th>
            ))}
            <th scope="col" className="hidden w-12 p-0 align-bottom font-mono text-[10px] font-normal uppercase text-muted-foreground sm:table-cell">
              Media
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.ours.map((p, i) => (
            <tr key={i}>
              <th
                scope="row"
                className={cn(
                  "sticky left-0 z-10 bg-background/95 p-1 text-left font-normal backdrop-blur",
                  activeRow === i && "text-primary",
                )}
              >
                <div className="flex max-w-[6rem] items-center gap-1.5 sm:max-w-[9rem] sm:gap-2">
                  <FactionAvatar factions={factions} faction={p.faction} className="h-6 w-6 sm:h-7 sm:w-7" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{playerLabel(p, i, "ours")}</span>
                    <span className="hidden truncate text-[10px] text-muted-foreground sm:block">{p.faction}</span>
                  </span>
                </div>
              </th>
              {(matrix.scores[i] ?? []).map((s, j) => {
                const ringed = highlight?.[i] === j;
                const Cell = onCell ? "button" : "div";
                return (
                  <td key={j} className="h-10 w-9 p-0 sm:h-11 sm:w-12">
                    <Cell
                      {...(onCell ? { type: "button" as const, onClick: () => onCell(i, j) } : {})}
                      aria-label={`${playerLabel(p, i, "ours")} contra ${playerLabel(matrix.theirs[j]!, j, "theirs")}: ${s ? `${s}, ${SCORE_LABEL[s]}` : "sin puntuar"}`}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-lg font-display text-sm font-black tabular-nums transition-transform sm:h-11 sm:text-base",
                        s ? SCORE_SOLID[s] : "border border-dashed border-border/70 text-muted-foreground/40",
                        onCell && "hover:scale-105 active:scale-95",
                        ringed && "ring-2 ring-white ring-offset-2 ring-offset-background",
                        highlight && !ringed && "opacity-45",
                      )}
                    >
                      {s ?? "·"}
                    </Cell>
                  </td>
                );
              })}
              <td className="hidden h-11 w-12 p-0 sm:table-cell">{avgCell(rowAvg(i))}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-background/95 p-1 text-left font-mono text-[10px] font-normal uppercase text-muted-foreground backdrop-blur">
              Media
            </th>
            {Array.from({ length: n }, (_, j) => (
              <td key={j} className="h-8 p-0">
                {avgCell(colAvg(j))}
              </td>
            ))}
            <td className="hidden sm:table-cell" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
