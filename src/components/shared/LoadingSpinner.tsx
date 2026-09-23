import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ className, size = "md", text }: LoadingSpinnerProps) {
  const dim = {
    sm: "h-6 w-6",
    md: "h-11 w-11",
    lg: "h-16 w-16",
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", dim)}>
        <div className="absolute inset-[-30%] rounded-full bg-brand-gradient opacity-20 blur-lg animate-pulse-glow" />
        <img
          src="/images/loading-icon.png"
          alt=""
          className="relative h-full w-full animate-spin opacity-90 [animation-duration:2.4s] [animation-timing-function:linear]"
        />
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
