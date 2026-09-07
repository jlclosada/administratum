import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type React from "react";
import CountUp from "react-countup";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  className?: string;
  color?: string;
}

/** Extract a leading number (and optional suffix like %) for the animated counter. */
function parseValue(value: number | string): { end: number; suffix: string } | null {
  if (typeof value === "number") return { end: value, suffix: "" };
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { end: parseFloat(match[1] ?? "0"), suffix: match[2] ?? "" };
}

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  className,
  color = "hsl(var(--brand))",
}: StatCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${mouseX}px ${mouseY}px, ${color}22, transparent 80%)`;

  const parsed = parseValue(value);

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group glass-card hover-glow relative overflow-hidden rounded-2xl p-6",
        className
      )}
    >
      {/* Cursor spotlight */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {parsed ? (
              <CountUp
                end={parsed.end}
                suffix={parsed.suffix}
                duration={1.4}
                separator="."
              />
            ) : (
              value
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            boxShadow: `0 8px 24px -8px ${color}`,
          }}
        >
          <span className="text-white">{icon}</span>
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className="absolute bottom-0 left-0 h-[3px] w-full opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
    </motion.div>
  );
}
