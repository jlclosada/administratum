import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminDeleteUser, adminListUsers, adminSetRole } from "@/db";
import { useIsAdmin, useIsSuperadmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { AdminUser } from "@/types";
import { Crown, Loader2, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Filter = "all" | "admins";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

export function AdminUsersPage() {
  const isAdmin = useIsAdmin();
  const isSuperadmin = useIsSuperadmin();
  const myId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminListUsers()
      .then(setUsers)
      .catch((err) => toast.error(errorText(err, "No se pudieron cargar los usuarios.")))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "admins" && !(u.role === "admin" || u.isSuperadmin)) return false;
      if (!q) return true;
      return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, filter]);

  const adminCount = users.filter((u) => u.role === "admin" || u.isSuperadmin).length;

  async function handleRole(user: AdminUser, role: "user" | "admin") {
    setBusyId(user.id);
    try {
      await adminSetRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      toast.success(role === "admin" ? `${user.displayName || user.email} ahora es administrador` : "Permisos retirados");
    } catch (err) {
      toast.error(errorText(err, "No se pudo cambiar el rol."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await adminDeleteUser(toDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
      toast.success("Cuenta eliminada");
      setToDelete(null);
    } catch (err) {
      toast.error(errorText(err, "No se pudo eliminar la cuenta."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell title="Usuarios" subtitle={`${users.length} cuentas · ${adminCount} administradores`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "admins"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "Todos" : "Administradores"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Cargando usuarios..." />
        </div>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
          {visible.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Ningún usuario coincide.</p>
          )}
          {visible.map((u) => {
            const isSelf = u.id === myId;
            const isAdminRow = u.role === "admin";
            // Mirrors the database rules (admin_set_role / admin_delete_user),
            // which remain the actual enforcement point.
            const canPromote = !u.isSuperadmin && !isAdminRow;
            const canDemote = !u.isSuperadmin && isAdminRow && isSuperadmin && !isSelf;
            const canDelete = !u.isSuperadmin && !isSelf && (!isAdminRow || isSuperadmin);
            const busy = busyId === u.id;
            return (
              <div key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <Link to={`/perfil/${u.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar src={u.avatarUrl} name={u.displayName || u.email} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium group-hover:text-primary">
                        {u.displayName || "Sin nombre"}
                      </span>
                      {u.isSuperadmin && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                          <Crown className="h-3 w-3" /> Superadmin
                        </span>
                      )}
                      {isAdminRow && !u.isSuperadmin && (
                        <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      )}
                      {isSelf && <span className="text-[10px] text-muted-foreground">(tú)</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Alta {formatDate(u.createdAt)} · Último acceso {formatDate(u.lastSignInAt)}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {canPromote && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => handleRole(u, "admin")}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Hacer admin
                    </Button>
                  )}
                  {canDemote && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => handleRole(u, "user")}>
                      <ShieldOff className="h-3.5 w-3.5" /> Quitar admin
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy}
                      onClick={() => setToDelete(u)}
                      aria-label={`Eliminar a ${u.displayName || u.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isSuperadmin && (
        <p className="text-xs text-muted-foreground">
          Solo el superadministrador puede retirar permisos o eliminar a otros administradores.
        </p>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && busyId === null && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Eliminar cuenta
            </DialogTitle>
            <DialogDescription>
              Se eliminará permanentemente la cuenta de{" "}
              <span className="font-medium text-foreground">{toDelete?.displayName || toDelete?.email}</span> y
              todo su contenido (colección, guías, fotos, mensajes). No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={busyId !== null}>
              Cancelar
            </Button>
            <Button variant="destructive" className="gap-2" onClick={handleDelete} disabled={busyId !== null}>
              {busyId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
