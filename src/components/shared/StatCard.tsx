import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  className?: string;
  color?: string;
}

export function StatCard({ label, value, icon, subtitle, className, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: color ? `${color}20` : "hsl(var(--primary) / 0.1)" }}
        >
          <span style={{ color: color || "hsl(var(--primary))" }}>{icon}</span>
        </div>
      </div>
      {color && (
        <div
          className="absolute bottom-0 left-0 h-1 w-full"
          style={{ backgroundColor: color }}
        />
      )}
    </motion.div>
  );
}
