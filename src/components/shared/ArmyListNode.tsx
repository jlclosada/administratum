import { formatResult, type ArmyListUnit, type ParsedArmyList } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Crown, Link2, Swords, Trophy, X } from "lucide-react";

export interface ArmyListNodeAttrs {
  data: ParsedArmyList;
  authorName: string;
  /** "victorias-derrotas-empates", e.g. "3-1-0". Null when not recorded. */
  result: string | null;
}

const ROLE_RE = /^(?:attached as|adjuntad[oa] como|unid[oa] como):\s*(\w+)/i;
const WARLORD_RE = /^(?:warlord|señor de la guerra)$/i;

/** Consecutive units sharing an "Attached unit N" label become one block. */
function groupUnits(units: ArmyListUnit[]): { group?: string; units: ArmyListUnit[] }[] {
  const blocks: { group?: string; units: ArmyListUnit[] }[] = [];
  for (const unit of units) {
    const last = blocks[blocks.length - 1];
    if (unit.group && last?.group === unit.group) last.units.push(unit);
    else blocks.push({ group: unit.group, units: [unit] });
  }
  return blocks;
}

function UnitRow({ unit }: { unit: ArmyListUnit }) {
  // "Attached as: Leader (...)" and "Warlord" read better as tags than as wargear lines.
  const role = unit.bullets.map((b) => b.text.match(ROLE_RE)?.[1]).find(Boolean);
  const warlord = unit.bullets.some((b) => WARLORD_RE.test(b.text));
  const bullets = unit.bullets.filter((b) => !ROLE_RE.test(b.text) && !WARLORD_RE.test(b.text));
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-sans text-sm font-medium text-foreground">{unit.name}</span>
          {role && (
            <span className="rounded border border-emerald-500/30 px-1 text-[9px] uppercase tracking-wider text-emerald-400/80">
              {role}
            </span>
          )}
          {warlord && (
            <span className="flex items-center gap-0.5 rounded border border-amber-500/30 px-1 text-[9px] uppercase tracking-wider text-amber-400">
              <Crown className="h-2.5 w-2.5" /> Warlord
            </span>
          )}
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-emerald-500/80">{unit.points} pts</span>
      </div>
      {bullets.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {bullets.map((b, bi) => (
            <div key={bi} className={cn("truncate text-[11px] text-zinc-500", b.depth > 0 ? "pl-6" : "pl-3")}>
              {b.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read-only card — used both while editing (via the TipTap NodeView) and when reading the published article. */
export function ArmyListCard({
  data,
  authorName,
  result,
  onRemove,
}: {
  data: ParsedArmyList;
  authorName: string;
  result: string | null;
  onRemove?: () => void;
}) {
  const label = formatResult(result);
  return (
    // Plain <div>/<span> throughout, not <p>/<ul>/<li> — this renders inside
    // .prose-editor (see globals.css), whose descendant selectors would
    // otherwise override this card's own margin/line-height/list-style.
    <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#050807] font-mono">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-emerald-500/80">
          <Swords className="h-3.5 w-3.5" />
          Lista de ejército{authorName ? ` · ${authorName}` : ""}
        </span>
        <div className="flex items-center gap-2">
          {label && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500">
              <Trophy className="h-3 w-3" />
              {label}
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full p-0.5 text-emerald-500/50 transition-colors hover:bg-destructive/20 hover:text-destructive"
              aria-label="Quitar lista"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 border-b border-emerald-500/10 px-4 py-3">
        <div className="font-sans text-base font-bold text-foreground">{data.listName}</div>
        <div className="text-xs text-zinc-400">
          {data.factionName}
          {data.detachmentName ? ` · ${data.detachmentName}` : ""}
          {" · "}
          <span className="text-emerald-500/80">{data.totalPoints} pts</span>
          {data.battleSize ? ` · ${data.battleSize.name} (${data.battleSize.points})` : ""}
        </div>
        {data.notes?.map((note) => (
          <div key={note} className="text-[11px] text-zinc-500">
            {note}
          </div>
        ))}
      </div>

      <div>
        {data.categories.map((cat, ci) => (
          <div key={cat.name} className={cn(ci !== 0 && "border-t border-emerald-500/10")}>
            <div className="border-b border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-emerald-500/60">
              {cat.name}
            </div>
            <div className="divide-y divide-emerald-500/10">
              {groupUnits(cat.units).map((block, bi) =>
                block.group ? (
                  <div key={`${block.group}-${bi}`} className="border-l-2 border-l-emerald-500/40 bg-emerald-500/[0.02]">
                    <div className="flex items-center justify-between px-4 pt-2 text-[10px] uppercase tracking-[0.15em] text-emerald-500/50">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="h-3 w-3" /> {block.group}
                      </span>
                      <span className="tabular-nums">{block.units.reduce((n, u) => n + u.points, 0)} pts</span>
                    </div>
                    {block.units.map((unit, ui) => (
                      <UnitRow key={`${unit.name}-${ui}`} unit={unit} />
                    ))}
                  </div>
                ) : (
                  block.units.map((unit, ui) => <UnitRow key={`${unit.name}-${bi}-${ui}`} unit={unit} />)
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArmyListNodeView({ node, editor, deleteNode }: NodeViewProps) {
  const attrs = node.attrs as ArmyListNodeAttrs;
  return (
    <NodeViewWrapper>
      <ArmyListCard
        data={attrs.data}
        authorName={attrs.authorName}
        result={attrs.result}
        onRemove={editor.isEditable ? () => deleteNode() : undefined}
      />
    </NodeViewWrapper>
  );
}

export const ArmyListNode = Node.create({
  name: "armyList",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      data: { default: null },
      authorName: { default: "" },
      result: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-army-list]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-army-list": "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArmyListNodeView);
  },
});
