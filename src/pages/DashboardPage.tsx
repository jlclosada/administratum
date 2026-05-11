import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardStats } from "@/db";
import type { DashboardStats } from "@/types";
import { PAINT_STATUSES } from "@/types";
import { motion } from "framer-motion";
import { Check, Paintbrush, Shield, Sword, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
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
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu colección de miniaturas</p>
        </div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={item}>
            <StatCard
              label="Total Miniaturas"
              value={stats.totalMiniatures}
              icon={<Sword className="h-5 w-5" />}
              color="#8b5cf6"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              label="Pintadas"
              value={stats.totalPainted}
              icon={<Paintbrush className="h-5 w-5" />}
              color="#34d399"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              label="Completado"
              value={`${stats.completionPercentage}%`}
              icon={<Target className="h-5 w-5" />}
              subtitle={`${stats.totalPainted} de ${stats.totalMiniatures}`}
              color="#f59e0b"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              label="Ejércitos"
              value={stats.totalArmies}
              icon={<Shield className="h-5 w-5" />}
              subtitle={`En ${stats.totalGames} juegos`}
              color="#60a5fa"
            />
          </motion.div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Distribución de Estados
              </CardTitle>
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
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value}</span>
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
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Progreso por Ejército
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.armyProgress.length > 0 ? (
                stats.armyProgress.slice(0, 6).map((army) => (
                  <div key={army.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{army.name}</span>
                      <span className="text-muted-foreground">
                        {army.totalPainted}/{army.totalMiniatures}
                      </span>
                    </div>
                    <Progress
                      value={army.completionPercentage}
                      className="h-2"
                      indicatorClassName={
                        army.completionPercentage === 100
                          ? "bg-green-500"
                          : army.completionPercentage > 50
                          ? "bg-yellow-500"
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
              <CardTitle>Últimas Miniaturas Añadidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentMiniatures.map((mini) => (
                  <motion.div
                    key={mini.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sword className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{mini.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {mini.quantity}x · {mini.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(mini.statuses ?? []).map((statusType) => {
                          const status = PAINT_STATUSES.find((s) => s.type === statusType);
                          if (!status) return null;
                          return (
                            <div
                              key={statusType}
                              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${status.color}20`,
                                color: status.color,
                              }}
                            >
                              <Check className="h-2.5 w-2.5" />
                              {status.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
