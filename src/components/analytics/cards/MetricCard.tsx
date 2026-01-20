import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ReactNode, memo } from "react";

interface TrendProps {
  value: string;
  label?: string;
  tone?: "positive" | "negative" | "neutral";
}

export interface MetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  trend?: TrendProps;
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
  skeletonClassName?: string;
}

const trendToneClasses: Record<NonNullable<TrendProps["tone"]>, string> = {
  positive: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  negative: "text-rose-600 bg-rose-50 border border-rose-100",
  neutral: "text-slate-600 bg-slate-50 border border-slate-100",
};

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  isLoading,
  className,
  children,
  skeletonClassName,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className={cn("h-8 w-24", skeletonClassName)} />
        ) : (
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        )}

        {subtitle && (
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        )}

        {trend && !isLoading && (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              trendToneClasses[trend.tone ?? "neutral"]
            )}
          >
            <span>{trend.value}</span>
            {trend.label && (
              <span className="font-normal text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}

        {children}
      </CardContent>
    </Card>
  );
});
