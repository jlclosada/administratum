import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ className, size = "md", text }: LoadingSpinnerProps) {
  const dim = {
    sm: "h-5 w-5",
    md: "h-9 w-9",
    lg: "h-14 w-14",
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", dim)}>
        {/* Orbital ring */}
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent [border-top-color:hsl(var(--brand))] [border-right-color:hsl(var(--brand-2))]" />
        {/* Inner counter ring */}
        <div
          className="absolute inset-1 animate-spin rounded-full border-2 border-transparent [border-bottom-color:hsl(var(--brand-3))]"
          style={{ animationDirection: "reverse", animationDuration: "1.1s" }}
        />
        {/* Core */}
        <div className="absolute inset-[38%] rounded-full bg-brand-gradient animate-pulse-glow" />
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
