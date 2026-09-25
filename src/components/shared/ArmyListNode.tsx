import { formatResult, type ParsedArmyList } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Swords, Trophy, X } from "lucide-react";

export interface ArmyListNodeAttrs {
  data: ParsedArmyList;
  authorName: string;
  /** "victorias-derrotas-empates", e.g. "3-1-0". Null when not recorded. */
  result: string | null;
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
        </div>
      </div>

      <div>
        {data.categories.map((cat, ci) => (
          <div key={cat.name} className={cn(ci !== 0 && "border-t border-emerald-500/10")}>
            <div className="border-b border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-emerald-500/60">
              {cat.name}
            </div>
            <div className="divide-y divide-emerald-500/10">
              {cat.units.map((unit, ui) => (
                <div key={`${unit.name}-${ui}`} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-sans text-sm font-medium text-foreground">{unit.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-emerald-500/80">
                      {unit.points} pts
                    </span>
                  </div>
                  {unit.bullets.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {unit.bullets.map((b, bi) => (
                        <div
                          key={bi}
                          className={cn(
                            "truncate text-[11px] text-zinc-500",
                            b.depth > 0 ? "pl-6" : "pl-3",
                          )}
                        >
                          {b.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
