import { PageTransition } from "@/components/shared/PageTransition";
import type { ReactNode } from "react";

/**
 * Header + body of one admin section. Access control and navigation live in
 * AdminLayout, which renders every admin section.
 */
export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </PageTransition>
  );
}
