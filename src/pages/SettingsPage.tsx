import { AvatarUploader } from "@/components/shared/AvatarUploader";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFactionCatalog } from "@/db";
import { useAuthStore, useProfileStore } from "@/stores";
import { normalizeUrl, profileLinks } from "@/lib/profileLinks";
import type { FactionCatalogEntry, ProfileLink } from "@/types";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    KeyRound,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    Plus,
    ShieldCheck,
    Swords,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const BIO_MAX_LENGTH = 280;
const MAX_LINKS = 5;

const APP_VERSION = "1.1.0";

type Feedback = { type: "success" | "error"; text: string } | null;

function useDisplayName() {
  const user = useAuthStore((s) => s.user);
  return (
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    ""
  );
}

function Alert({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{feedback.text}</span>
    </div>
  );
}

export function SettingsPage() {
  const { user, signOut, updateProfile, updateEmail, updatePassword, deleteAccount } =
    useAuthStore();
  const { profile, updateProfile: updateProfileFields } = useProfileStore();
  const currentName = useDisplayName();

  // Profile
  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [favoriteFaction, setFavoriteFaction] = useState("");
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [factions, setFactions] = useState<FactionCatalogEntry[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Feedback>(null);

  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatarUrl);
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");
    setFavoriteFaction(profile.favoriteFaction ?? "");
    setLinks(profileLinks(profile));
  }, [profile]);

  useEffect(() => {
    getFactionCatalog("Warhammer 40,000")
      .then(setFactions)
      .catch(() => setFactions([]));
  }, []);

  // Email
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Feedback>(null);

  // Password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Feedback>(null);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<Feedback>(null);

  const initial = (currentName || user?.email || "?").charAt(0).toUpperCase();

  const handleAvatarChange = async (url: string | null) => {
    setAvatarUrl(url);
    try {
      await updateProfileFields({ avatarUrl: url });
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo guardar el avatar.",
      });
    }
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim()) {
      setProfileMsg({ type: "error", text: "El nombre no puede estar vacío." });
      return;
    }
    if (bio.length > BIO_MAX_LENGTH) {
      setProfileMsg({
        type: "error",
        text: `La biografía no puede superar los ${BIO_MAX_LENGTH} caracteres.`,
      });
      return;
    }
    const cleanLinks: ProfileLink[] = [];
    for (const link of links) {
      if (!link.url.trim()) continue;
      const url = normalizeUrl(link.url);
      if (!url) {
        setProfileMsg({ type: "error", text: `El enlace "${link.url}" no es válido.` });
        return;
      }
      cleanLinks.push({ label: link.label.trim(), url });
    }
    setSavingProfile(true);
    try {
      await updateProfile(name.trim());
      await updateProfileFields({
        displayName: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        favoriteFaction: favoriteFaction || null,
        links: cleanLinks,
        website: cleanLinks[0]?.url ?? null,
      });
      setLinks(cleanLinks);
      setProfileMsg({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo guardar.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!email.trim()) {
      setEmailMsg({ type: "error", text: "Introduce un correo válido." });
      return;
    }
    if (email.trim() === user?.email) {
      setEmailMsg({ type: "error", text: "Ese ya es tu correo actual." });
      return;
    }
    setSavingEmail(true);
    try {
      await updateEmail(email.trim());
      setEmailMsg({
        type: "success",
        text: "Te hemos enviado un enlace de confirmación a tu correo actual y al nuevo.",
      });
      setEmail("");
    } catch (err) {
      setEmailMsg({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo cambiar el correo.",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (password.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "La contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (password !== confirm) {
      setPasswordMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setPasswordMsg({ type: "success", text: "Contraseña actualizada correctamente." });
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo cambiar la contraseña.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async () => {
    setDeleteMsg(null);
    setDeleting(true);
    try {
      await deleteAccount();
      // On success the auth state resets and the app returns to the login screen.
    } catch (err) {
      setDeleteMsg({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "No se pudo eliminar la cuenta. Inténtalo de nuevo.",
      });
      setDeleting(false);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Ajustes
          </h1>
          <p className="text-muted-foreground">Gestiona tu cuenta y preferencias</p>
        </div>

        {/* Account summary */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-xl font-bold text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {currentName || "Mi cuenta"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {user && (
                <Button variant="outline" className="gap-2" asChild>
                  <Link to={`/perfil/${user.id}`}>
                    <UserRound className="h-4 w-4" />
                    Ver mi perfil
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-5 w-5 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfile} className="space-y-5">
              <div className="space-y-2">
                <Label>Foto de perfil</Label>
                <AvatarUploader
                  avatarUrl={avatarUrl}
                  fallbackLabel={initial}
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre visible</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Biografía</Label>
                  <span
                    className={`text-xs tabular-nums ${
                      bio.length > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {bio.length}/{BIO_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntale a la comunidad a qué juegas y qué pintas..."
                  rows={3}
                  maxLength={BIO_MAX_LENGTH + 40}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Ubicación
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Madrid, España"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favoriteFaction" className="flex items-center gap-1.5">
                    <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                    Facción favorita
                  </Label>
                  <select
                    id="favoriteFaction"
                    value={favoriteFaction}
                    onChange={(e) => setFavoriteFaction(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Sin especificar</option>
                    {factions.map((f) => (
                      <option key={f.factionSlug} value={f.factionName}>
                        {f.factionName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Enlaces</Label>
                  <span className="text-xs text-muted-foreground">
                    {links.length}/{MAX_LINKS}
                  </span>
                </div>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={link.label}
                      onChange={(e) =>
                        setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))
                      }
                      placeholder="Instagram"
                      className="w-32 shrink-0"
                      aria-label={`Nombre del enlace ${i + 1}`}
                    />
                    <Input
                      value={link.url}
                      onChange={(e) =>
                        setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)))
                      }
                      placeholder="instagram.com/tu_usuario"
                      aria-label={`URL del enlace ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Quitar enlace ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {links.length < MAX_LINKS && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir enlace
                  </Button>
                )}
              </div>

              <Alert feedback={profileMsg} />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingProfile} className="gap-2">
                  {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Correo electrónico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmail} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo actual</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Nuevo correo</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nuevo@correo.com"
                  autoComplete="email"
                />
              </div>
              <Alert feedback={emailMsg} />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingEmail} className="gap-2">
                  {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cambiar correo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-5 w-5 text-primary" />
              Contraseña
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Alert feedback={passwordMsg} />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingPassword} className="gap-2">
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Actualizar contraseña
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Seguridad y datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tus datos se sincronizan de forma segura en la nube con Supabase y
              solo son accesibles desde tu cuenta. Cada colección está aislada por
              usuario mediante políticas de seguridad a nivel de fila.
            </p>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zona de peligro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Eliminar mi cuenta</p>
              <p className="text-sm text-muted-foreground">
                Se borrarán permanentemente tu cuenta y todos tus datos. Esta
                acción no se puede deshacer.
              </p>
            </div>
            <Button
              variant="destructive"
              className="gap-2 shrink-0"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteMsg(null);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar cuenta
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-primary" />
              Acerca de
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Administratum</span> v
                {APP_VERSION}
              </p>
              <p>Gestor de colecciones de miniaturas para wargaming.</p>
              <p className="pt-2 text-xs">
                © {new Date().getFullYear()} Jose Luis Caceres Losada. Todos los
                derechos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar cuenta
            </DialogTitle>
            <DialogDescription>
              Esta acción es permanente. Se eliminarán tu cuenta, tus juegos,
              ejércitos, miniaturas, imágenes y listas. No podrás recuperarlos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="deleteConfirm">
              Escribe <span className="font-semibold text-foreground">ELIMINAR</span> para
              confirmar
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
            />
            <Alert feedback={deleteMsg} />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={deleteConfirm !== "ELIMINAR" || deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

