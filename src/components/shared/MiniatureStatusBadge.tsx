import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMiniatureStatusSummary, type PaintStatusType } from "@/types";

export function MiniatureStatusBadge({
  statuses,
  className,
}: {
  statuses: PaintStatusType[] | undefined;
  className?: string;
}) {
  const { complete, inProgress, label } = getMiniatureStatusSummary(
    statuses ?? [],
  );
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        complete &&
          "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
        !complete &&
          inProgress &&
          "border-amber-500/50 bg-amber-500/10 text-amber-500",
        !complete && !inProgress && "text-muted-foreground",
        className,
      )}
    >
      {complete ? `✓ ${label}` : label}
    </Badge>
  );
}

export function miniatureReadyClass(statuses: PaintStatusType[] | undefined): string {
  return getMiniatureStatusSummary(statuses ?? []).complete
    ? "bg-emerald-500/10"
    : "";
}
