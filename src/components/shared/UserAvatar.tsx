import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-28 w-28 text-4xl sm:h-36 sm:w-36",
} as const;

/** Profile picture with the initial-on-gradient fallback used across the app. */
export function UserAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient font-bold uppercase text-white",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        (name?.trim() || "?").charAt(0)
      )}
    </span>
  );
}
