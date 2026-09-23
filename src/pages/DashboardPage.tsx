import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardStats } from "@/db";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import { PAINT_STATUSES, getCurrentPaintStep, isMiniatureComplete } from "@/types";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function parseValue(value: number | string): { end: number; suffix: string } | null {
  if (typeof value === "number") return { end: value, suffix: "" };
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { end: parseFloat(match[1] ?? "0"), suffix: match[2] ?? "" };
}

function StatColumn({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  accent: string;
}) {
  const parsed = parseValue(value);
  return (
    <div className={cn("border-t-2 px-5 py-4", accent)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-mono text-3xl font-medium tabular-nums tracking-tight text-foreground">
        {parsed ? <CountUp end={parsed.end} suffix={parsed.suffix} duration={1.2} separator="." /> : value}
      </p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando colección..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            No se pudieron cargar las estadísticas. Añade miniaturas para empezar.
          </p>
        </div>
      </PageTransition>
    );
  }

  const pieData = stats.statusDistribution.map((s) => {
    const status = PAINT_STATUSES.find((p) => p.type === s.status);
    return {
      name: status?.name ?? s.status,
      value: s.count,
      color: status?.color ?? "#6b7280",
    };
  });

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Resumen de tu colección de miniaturas</p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 sm:grid-cols-4 sm:divide-y-0">
          <StatColumn
            label="Miniaturas"
            value={stats.totalMiniatures}
            accent="border-t-violet-500/70"
          />
          <StatColumn
            label="Pintadas"
            value={stats.totalPainted}
            accent="border-t-emerald-500/70"
          />
          <StatColumn
            label="Completado"
            value={`${stats.completionPercentage}%`}
            subtitle={`${stats.totalPainted} de ${stats.totalMiniatures}`}
            accent="border-t-amber-500/70"
          />
          <StatColumn
            label="Ejércitos"
            value={stats.totalArmies}
            subtitle={`En ${stats.totalGames} juegos`}
            accent="border-t-sky-500/70"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución de estados</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-mono text-sm tabular-nums">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Añade miniaturas para ver las estadísticas
                </p>
              )}
            </CardContent>
          </Card>

          {/* Army Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progreso por ejército</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.armyProgress.length > 0 ? (
                stats.armyProgress.slice(0, 6).map((army) => (
                  <div key={army.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{army.name}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {army.totalPainted}/{army.totalMiniatures}
                        {(army.totalPoints ?? 0) > 0
                          ? ` · ${army.totalPoints.toLocaleString("es-ES")} pts`
                          : ""}
                      </span>
                    </div>
                    <Progress
                      value={army.completionPercentage}
                      className="h-1.5"
                      indicatorClassName={
                        army.completionPercentage === 100
                          ? "bg-emerald-500"
                          : army.completionPercentage > 50
                          ? "bg-amber-500"
                          : "bg-primary"
                      }
                    />
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Crea ejércitos para ver el progreso
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Miniatures */}
        {stats.recentMiniatures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimas miniaturas añadidas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {stats.recentMiniatures.map((mini) => (
                  <div
                    key={mini.id}
                    className="flex items-center justify-between gap-3 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{mini.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {mini.quantity}x · {mini.category}
                      </p>
                    </div>
                    {(() => {
                      const statuses = mini.statuses ?? [];
                      const complete = isMiniatureComplete(statuses);
                      const current = getCurrentPaintStep(statuses);
                      if (complete) {
                        return (
                          <span className="shrink-0 text-xs font-medium text-emerald-500">
                            Completada
                          </span>
                        );
                      }
                      if (current) {
                        return (
                          <span
                            className="shrink-0 text-xs font-medium"
                            style={{ color: current.color }}
                          >
                            {current.name}
                          </span>
                        );
                      }
                      return (
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          Sin empezar
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
