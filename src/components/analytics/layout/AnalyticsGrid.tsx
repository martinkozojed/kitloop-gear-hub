import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalyticsGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function AnalyticsGrid({
  children,
  className,
  columns = 3,
}: AnalyticsGridProps) {
  const baseCols =
    columns === 4
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      : columns === 2
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-4 lg:gap-6", baseCols, className)}>
      {children}
    </div>
  );
}
