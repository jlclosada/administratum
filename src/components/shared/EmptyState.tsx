import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl py-16 text-center",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 spotlight opacity-60" />
      <motion.div
        initial={{ scale: 0.8, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
        className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft border border-border/60 backdrop-blur"
      >
        <div className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 blur-md" />
        <span className="relative text-primary">
          {icon || <AlertTriangle className="h-8 w-8" />}
        </span>
      </motion.div>
      <h3 className="relative text-lg font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button
          variant="gradient"
          onClick={action.onClick}
          className="relative mt-6"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
