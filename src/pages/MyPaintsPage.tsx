import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    addUserPaints,
    getUserPaints,
    getWishlistPaints,
    moveToCollection,
    moveToWishlist,
    removeUserPaint,
    searchPaints,
} from "@/db";
import type { Paint, UserPaint } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import {
    Check,
    Droplets,
    FileDown,
    Palette,
    Plus,
    Search,
    ShoppingCart,
    Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Range color map ─────────────────────────────────────

const RANGE_COLORS: Record<string, string> = {
  Base: "#3b82f6",
  Layer: "#10b981",
  Shade: "#8b5cf6",
  Dry: "#f59e0b",
  Edge: "#ec4899",
  Glaze: "#06b6d4",
  Texture: "#78716c",
  Technical: "#6366f1",
  Contrast: "#f97316",
  Air: "#0ea5e9",
  "Model Color": "#e11d48",
  Auxiliary: "#a3a3a3",
};

// ─── Paint Card ──────────────────────────────────────────

function PaintCard({
  userPaint,
  onRemove,
  onMoveToWishlist,
}: {
  userPaint: UserPaint;
  onRemove: (id: string) => void;
  onMoveToWishlist?: (id: string) => void;
}) {
  const paint = userPaint.paint!;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
    >
      {/* Color swatch */}
      <div
        className="h-8 w-8 shrink-0 rounded-full border-2 border-border shadow-sm"
        style={{ backgroundColor: paint.hexColor || "#888" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{paint.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            style={{ backgroundColor: `${RANGE_COLORS[paint.range] ?? "#666"}20`, color: RANGE_COLORS[paint.range] ?? "#666" }}
          >
            {paint.range}
          </Badge>
          {paint.isMetallic && (
            <span className="text-[10px] text-muted-foreground">✦ Metálica</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMoveToWishlist && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMoveToWishlist(userPaint.id)}
            title="Mover a carrito"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRemove(userPaint.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Wishlist Card ───────────────────────────────────────

function WishlistCard({
  userPaint,
  onRemove,
  onMoveToCollection,
}: {
  userPaint: UserPaint;
  onRemove: (id: string) => void;
  onMoveToCollection: (id: string) => void;
}) {
  const paint = userPaint.paint!;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
    >
      <div
        className="h-8 w-8 shrink-0 rounded-full border-2 border-border shadow-sm"
        style={{ backgroundColor: paint.hexColor || "#888" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{paint.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
            style={{ backgroundColor: `${RANGE_COLORS[paint.range] ?? "#666"}20`, color: RANGE_COLORS[paint.range] ?? "#666" }}
          >
            {paint.range}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMoveToCollection(userPaint.id)}
          title="Marcar como comprada"
        >
          <Check className="h-3.5 w-3.5 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRemove(userPaint.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Search/Add Modal ────────────────────────────────────

function AddPaintsModal({
  open,
  onClose,
  onAdd,
  existingPaintIds,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (paintIds: string[]) => Promise<void>;
  existingPaintIds: Set<string>;
  mode: "collection" | "wishlist";
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Paint[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(new Set());
      return;
    }
    // Initial load
    handleSearch("");
  }, [open]);

  async function handleSearch(q: string) {
    setQuery(q);
    setLoading(true);
    try {
      const res = await searchPaints(q);
      setResults(res);
    } finally {
      setLoading(false);
    }
  }

  function togglePaint(paintId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(paintId)) {
        next.delete(paintId);
      } else {
        next.add(paintId);
      }
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await onAdd(Array.from(selected));
      onClose();
    } finally {
      setAdding(false);
    }
  }

  const filteredResults = results.filter((p) => !existingPaintIds.has(p.id));

  // Group by brand then range
  const grouped = filteredResults.reduce<Record<string, Paint[]>>((acc, p) => {
    const key = `${p.brand} – ${p.range}`;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "collection" ? "Añadir Pinturas" : "Añadir al Carrito"}
          </DialogTitle>
          <DialogDescription>
            Busca y selecciona las pinturas que quieres {mode === "collection" ? "añadir a tu colección" : "añadir a tu lista de compras"}.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, marca o tipo..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Selection count */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="default">{selected.size} seleccionada(s)</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Limpiar
            </Button>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6" style={{ maxHeight: "400px" }}>
          {Object.entries(grouped).map(([groupKey, paints]) => {
            const range = groupKey.split(" – ")[1] ?? groupKey;
            return (
            <div key={groupKey} className="mb-3">
              <p
                className="text-xs font-bold uppercase tracking-wider mb-1.5 px-1"
                style={{ color: RANGE_COLORS[range] ?? "#666" }}
              >
                {groupKey} ({paints.length})
              </p>
              <div className="space-y-1">
                {paints.map((paint) => {
                  const isSelected = selected.has(paint.id);
                  return (
                    <button
                      key={paint.id}
                      onClick={() => togglePaint(paint.id)}
                      className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className="h-6 w-6 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: paint.hexColor || "#888" }}
                      />
                      <span className="flex-1 text-sm font-medium truncate">
                        {paint.name}
                      </span>
                      {paint.isMetallic && (
                        <span className="text-[10px] text-muted-foreground">✦</span>
                      )}
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
          })}
          {filteredResults.length === 0 && !loading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {query ? "No se encontraron pinturas" : "Todas las pinturas ya están en tu colección"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0 || adding}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────

export function MyPaintsPage() {
  const [myPaints, setMyPaints] = useState<UserPaint[]>([]);
  const [wishlist, setWishlist] = useState<UserPaint[]>([]);
  const [, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "wishlist">("collection");
  const [filterQuery, setFilterQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [paints, wl] = await Promise.all([getUserPaints(), getWishlistPaints()]);
      setMyPaints(paints);
      setWishlist(wl);
    } catch (err) {
      console.error("Failed to load paints:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const existingPaintIds = new Set([
    ...myPaints.map((up) => up.paintId),
    ...wishlist.map((up) => up.paintId),
  ]);

  function handleExportPDF() {
    if (myPaints.length === 0 && wishlist.length === 0) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const colWidth = (pageWidth - margin * 2) / 3;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageHeight - margin) { pdf.addPage(); y = margin; }
    };

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text("Mi Colección de Pinturas", margin, y);
    y += 7;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(120, 120, 120);
    pdf.text(`${myPaints.length} pinturas · ${wishlist.length} en carrito · ${new Date().toLocaleDateString("es-ES")}`, margin, y);
    y += 5;
    pdf.setDrawColor(124, 58, 237); pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y); y += 8;

    // Group by brand then range
    const grouped: Record<string, Record<string, UserPaint[]>> = {};
    for (const up of myPaints) {
      const brand = up.paint?.brand ?? "Otros";
      const range = up.paint?.range ?? "Otros";
      if (!grouped[brand]) grouped[brand] = {};
      if (!grouped[brand]![range]) grouped[brand]![range] = [];
      grouped[brand]![range]!.push(up);
    }

    for (const [brand, ranges] of Object.entries(grouped)) {
      checkPage(12);
      pdf.setFontSize(13); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 30, 30);
      pdf.text(brand, margin, y); y += 7;

      for (const [range, paints] of Object.entries(ranges)) {
        checkPage(10);
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(124, 58, 237);
        pdf.text(`${range} (${paints.length})`, margin + 2, y); y += 5;

        let col = 0;
        for (const up of paints) {
          const paint = up.paint!;
          checkPage(7);
          const x = margin + 2 + col * colWidth;

          // Color circle
          const hex = paint.hexColor ?? "#888888";
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          pdf.setFillColor(r, g, b);
          pdf.circle(x + 2, y - 1.2, 1.8, "F");
          pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.2);
          pdf.circle(x + 2, y - 1.2, 1.8, "S");

          pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(50, 50, 50);
          pdf.text(paint.name, x + 6, y);

          col++;
          if (col >= 3) { col = 0; y += 5; }
        }
        if (col > 0) y += 5;
        y += 2;
      }
      y += 3;
    }

    // Wishlist section
    if (wishlist.length > 0) {
      checkPage(16);
      pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y); y += 8;
      pdf.setFontSize(14); pdf.setFont("helvetica", "bold"); pdf.setTextColor(234, 88, 12);
      pdf.text(`Carrito de Compra (${wishlist.length})`, margin, y); y += 7;

      let col = 0;
      for (const up of wishlist) {
        const paint = up.paint!;
        checkPage(7);
        const x = margin + 2 + col * colWidth;
        const hex = paint.hexColor ?? "#888888";
        const rv = parseInt(hex.slice(1, 3), 16);
        const gv = parseInt(hex.slice(3, 5), 16);
        const bv = parseInt(hex.slice(5, 7), 16);
        pdf.setFillColor(rv, gv, bv);
        pdf.circle(x + 2, y - 1.2, 1.8, "F");
        pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.2);
        pdf.circle(x + 2, y - 1.2, 1.8, "S");
        pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(50, 50, 50);
        pdf.text(paint.name, x + 6, y);
        col++;
        if (col >= 3) { col = 0; y += 5; }
      }
    }

    pdf.save("mi-coleccion-pinturas.pdf");
  }

  async function handleAddToCollection(paintIds: string[]) {
    await addUserPaints(paintIds, false);
    await loadData();
  }

  async function handleAddToWishlist(paintIds: string[]) {
    await addUserPaints(paintIds, true);
    await loadData();
  }

  async function handleRemove(id: string) {
    await removeUserPaint(id);
    await loadData();
  }

  async function handleMoveToWishlist(id: string) {
    await moveToWishlist(id);
    await loadData();
  }

  async function handleMoveToCollection(id: string) {
    await moveToCollection(id);
    await loadData();
  }

  const filteredMyPaints = filterQuery
    ? myPaints.filter((up) => up.paint?.name.toLowerCase().includes(filterQuery.toLowerCase()))
    : myPaints;

  const filteredWishlist = filterQuery
    ? wishlist.filter((up) => up.paint?.name.toLowerCase().includes(filterQuery.toLowerCase()))
    : wishlist;

  // Group paints by range
  const groupedPaints = filteredMyPaints.reduce<Record<string, UserPaint[]>>((acc, up) => {
    const range = up.paint?.range ?? "Otro";
    if (!acc[range]) acc[range] = [];
    acc[range]!.push(up);
    return acc;
  }, {});

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Mis Pinturas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona tu colección de pinturas y tu lista de compras
            </p>
          </div>
          {(myPaints.length > 0 || wishlist.length > 0) && (
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
              <FileDown className="h-4 w-4" /> Exportar PDF
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myPaints.length}</p>
                  <p className="text-xs text-muted-foreground">En colección</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <ShoppingCart className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{wishlist.length}</p>
                  <p className="text-xs text-muted-foreground">Por comprar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Droplets className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(myPaints.map((p) => p.paint?.range)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Tipos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(myPaints.map((p) => p.paint?.brand)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Marcas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("collection")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "collection"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Palette className="h-4 w-4 inline mr-1.5" />
            Mi Colección ({myPaints.length})
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "wishlist"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4 inline mr-1.5" />
            Carrito de Compra ({wishlist.length})
          </button>
        </div>

        {/* Filter + Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar pinturas..."
              className="pl-9"
            />
          </div>
          {activeTab === "collection" ? (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Añadir pinturas
            </Button>
          ) : (
            <Button onClick={() => setShowWishlistModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Añadir al carrito
            </Button>
          )}
        </div>

        {/* Content */}
        {activeTab === "collection" ? (
          <div className="space-y-6">
            {Object.keys(groupedPaints).length === 0 ? (
              <div className="text-center py-12">
                <Palette className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-1">No tienes pinturas en tu colección</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Añade las pinturas que tienes para llevar un control de tu inventario
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir pinturas
                </Button>
              </div>
            ) : (
              Object.entries(groupedPaints).map(([range, paints]) => (
                <div key={range}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: RANGE_COLORS[range] ?? "#666" }}
                    />
                    <h3 className="text-sm font-semibold">{range}</h3>
                    <Badge variant="secondary" className="text-xs">{paints.length}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {paints.map((up) => (
                        <PaintCard
                          key={up.id}
                          userPaint={up}
                          onRemove={handleRemove}
                          onMoveToWishlist={handleMoveToWishlist}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            {filteredWishlist.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-1">Tu carrito de compra está vacío</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Añade las pinturas que necesitas comprar próximamente
                </p>
                <Button onClick={() => setShowWishlistModal(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir al carrito
                </Button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredWishlist.map((up) => (
                    <WishlistCard
                      key={up.id}
                      userPaint={up}
                      onRemove={handleRemove}
                      onMoveToCollection={handleMoveToCollection}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <AddPaintsModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddToCollection}
          existingPaintIds={existingPaintIds}
          mode="collection"
        />
        <AddPaintsModal
          open={showWishlistModal}
          onClose={() => setShowWishlistModal(false)}
          onAdd={handleAddToWishlist}
          existingPaintIds={existingPaintIds}
          mode="wishlist"
        />
      </div>
    </PageTransition>
  );
}
