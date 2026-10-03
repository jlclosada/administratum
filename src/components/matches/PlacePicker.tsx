import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentPosition, reversePlace, searchPlaces, type Place } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Pick a place: type a city, street or shop (OpenStreetMap search) or use
 * the browser's location. Calls onChange with null when cleared.
 */
export function PlacePicker({
  value,
  onChange,
  placeholder = "Ciudad, calle o tienda",
  className,
  id,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"search" | "locate" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Nominatim asks for ≤1 request/s: wait for a pause in typing.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading("search");
      searchPlaces(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(null));
    }, 700);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function locate() {
    setLoading("locate");
    try {
      const pos = await currentPosition();
      onChange(await reversePlace(pos.lat, pos.lng));
      setQuery("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  if (value) {
    return (
      <div className={cn("flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm", className)}>
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{value.label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground" aria-label="Cambiar ubicación">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className={cn("relative flex gap-2", className)}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="h-10 pl-9"
          autoComplete="off"
          aria-label="Buscar ubicación"
        />
        {loading === "search" && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {open && results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">{r.label}</span>
                </button>
              </li>
            ))}
            <li className="border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">© OpenStreetMap</li>
          </ul>
        )}
      </div>
      <Button type="button" variant="outline" className="h-10 shrink-0 gap-2" onClick={locate} disabled={loading === "locate"} title="Usar mi ubicación">
        {loading === "locate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        <span className="hidden sm:inline">Mi ubicación</span>
      </Button>
    </div>
  );
}
