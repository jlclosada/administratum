import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Search, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { FACTION_GROUPS, factionGroup, findFaction, type FactionOption } from "./factions";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase();

/**
 * Army picker: a card with the chosen faction's artwork that opens a gallery
 * of every faction (a bottom sheet on phones), grouped and searchable in
 * English or Spanish.
 */
export function FactionPicker({
  factions,
  value,
  onChange,
  who,
}: {
  factions: FactionOption[];
  value: string;
  onChange: (name: string) => void;
  /** "Ana" or "Rival 3", for the labels. */
  who: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = value ? findFaction(factions, value) : null;

  const groups = useMemo(() => {
    const q = fold(query.trim());
    const hits = factions
      .filter((f) => !q || fold(`${f.name} ${f.es ?? ""}`).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
    return FACTION_GROUPS.map((g) => [g, hits.filter((f) => factionGroup(f.name) === g)] as const).filter(([, list]) => list.length);
  }, [factions, query]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ejército de ${who}: ${value || "sin elegir"}`}
        className={cn(
          "group relative isolate flex h-12 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 text-left transition-colors",
          value ? "border-border/60 hover:border-primary/50" : "border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
        )}
      >
        {value ? (
          <>
            {selected?.image && (
              <>
                <img src={selected.image} alt="" className="absolute inset-y-0 right-0 -z-10 h-full w-3/4 object-cover object-[50%_30%] opacity-80" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-card via-card/90 to-card/10" />
              </>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{selected?.name ?? value}</span>
              {selected?.es && <span className="block truncate text-[11px] text-muted-foreground">{selected.es}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </>
        ) : (
          <>
            <Swords className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">Elegir ejército</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </>
        )}
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <DialogContent
          className="flex flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh] sm:max-w-3xl sm:p-0"
          // No keyboard popping up on phones as soon as it opens.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-3 border-b border-border/60 p-4 pr-12 sm:p-5 sm:pr-12">
            <div>
              <DialogTitle className="font-display text-xl">Ejército de {who}</DialogTitle>
              <DialogDescription className="mt-1 text-xs">Busca en inglés o en español.</DialogDescription>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Thousand Sons, Necrones, Orkos…"
                aria-label="Buscar ejército"
                className="h-11 w-full rounded-xl border border-input bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
              />
            </label>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {groups.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Ningún ejército coincide con «{query}».</p>}
            {groups.map(([group, list]) => (
              <section key={group} className="space-y-2.5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{group}</h3>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {list.map((f) => {
                    const active = selected?.name === f.name;
                    return (
                      <li key={f.name}>
                        <button
                          type="button"
                          onClick={() => pick(f.name)}
                          aria-pressed={active}
                          className={cn(
                            "group relative isolate flex aspect-[4/3] w-full flex-col justify-end overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-[0.97]",
                            active ? "border-primary ring-2 ring-primary" : "border-border/60 hover:border-primary/50",
                          )}
                        >
                          {f.image ? (
                            <img
                              src={f.image}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <span className="absolute inset-0 -z-10 bg-gradient-to-br from-card to-background" />
                          )}
                          <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          {active && (
                            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="text-sm font-semibold leading-tight text-white">{f.name}</span>
                          {f.es && <span className="text-[11px] leading-tight text-white/70">{f.es}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
