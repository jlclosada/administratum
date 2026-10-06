import { UserAvatar } from "@/components/shared/UserAvatar";
import { Input } from "@/components/ui/input";
import { searchProfiles } from "@/db";
import { inviteeKey } from "@/lib/matches";
import type { MatchInvitee, Profile } from "@/types";
import { Loader2, Mail, Search, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * Pick opponents already agreed: search players by name, or type the email
 * of someone without an account (they get a link to sign up and accept).
 */
export function MatchInvitePicker({
  value,
  onChange,
  max,
  exclude = [],
  disabled,
}: {
  value: MatchInvitee[];
  onChange: (next: MatchInvitee[]) => void;
  /** Seats that can still be offered. */
  max: number;
  /** User ids that can't be invited (the host, players already in). */
  exclude?: string[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const term = query.trim();
  const isEmail = EMAIL_RE.test(term);
  const full = value.length >= max;

  useEffect(() => {
    if (term.length < 2 || isEmail) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchProfiles(term)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [term, isEmail]);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const taken = new Set([...exclude.map((id) => `u:${id}`), ...value.map(inviteeKey)]);

  function add(i: MatchInvitee) {
    if (full || taken.has(inviteeKey(i))) return;
    onChange([...value, i]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div ref={box} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isEmail) {
              e.preventDefault();
              add({ kind: "email", email: term.toLowerCase() });
            }
          }}
          placeholder={full ? "No quedan plazas para invitar" : "Nombre de un jugador o correo electrónico"}
          className="pl-9"
          disabled={disabled || full}
          aria-label="Invitar a un rival"
          autoComplete="off"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {open && (isEmail || results.length > 0) && (
          <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-popover shadow-xl">
            {isEmail && (
              <li>
                <button
                  type="button"
                  onClick={() => add({ kind: "email", email: term.toLowerCase() })}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">Invitar a {term.toLowerCase()}</span>
                    <span className="block text-xs text-muted-foreground">Le enviaremos un correo con la invitación</span>
                  </span>
                </button>
              </li>
            )}
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={taken.has(`u:${p.id}`)}
                  onClick={() => add({ kind: "user", profile: p })}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                >
                  <UserAvatar src={p.avatarUrl} name={p.displayName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.displayName}</span>
                    {p.favoriteFaction && <span className="block truncate text-xs text-muted-foreground">{p.favoriteFaction}</span>}
                  </span>
                  {taken.has(`u:${p.id}`) ? <span className="text-xs text-muted-foreground">Añadido</span> : <UserPlus className="h-4 w-4 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((i) => (
            <span key={inviteeKey(i)} className="flex items-center gap-2 rounded-full border border-primary/40 bg-brand-soft py-1 pl-1 pr-2 text-sm">
              {i.kind === "user" ? (
                <UserAvatar src={i.profile.avatarUrl} name={i.profile.displayName} size="xs" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Mail className="h-3 w-3" />
                </span>
              )}
              <span className="max-w-[14rem] truncate">{i.kind === "user" ? i.profile.displayName : i.email}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => inviteeKey(x) !== inviteeKey(i)))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Quitar invitación"
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
