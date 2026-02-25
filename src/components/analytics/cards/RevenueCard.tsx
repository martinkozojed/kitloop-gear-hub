import { ReactNode, memo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { RevenueComparison } from "@/lib/analytics/types";
import { formatCurrencyCZ, formatPercentDelta } from "@/lib/analytics/formatters";

interface RevenueCardProps {
  data?: RevenueComparison;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  trendLabel?: string;
  iconComponent?: ReactNode;
  skeletonClassName?: string;
}

export const RevenueCard = memo(function RevenueCard({
  data,
  isLoading,
  title = "Tržby (aktuální měsíc)",
  subtitle,
  trendLabel = "vs. minulý měsíc",
  iconComponent,
  skeletonClassName,
}: RevenueCardProps) {
  const currentTotal =
    data && formatCurrencyCZ(data.current.totalCents, data.current.currency);

  const changeTone =
    data && data.changeRatio !== 0
      ? data.changeRatio > 0
        ? "positive"
        : "negative"
      : "neutral";

  const TrendIcon =
    changeTone === "positive"
      ? ArrowUpRight
      : changeTone === "negative"
        ? ArrowDownRight
        : null;

  return (
    <MetricCard
      title={title}
      value={currentTotal ?? "—"}
      subtitle={subtitle ?? (data ? undefined : "Načítání dat…")}
      trend={
        data
          ? {
            value: formatPercentDelta(data.changeRatio),
            tone: changeTone,
            label: trendLabel,
          }
          : undefined
      }
      icon={
        iconComponent ?? (
          TrendIcon ? (
            <span
              className={`rounded-full p-2 ${changeTone === "positive"
                ? "bg-status-success/10 text-status-success border border-status-success/20"
                : changeTone === "negative"
                  ? "bg-status-danger/10 text-status-danger border border-status-danger/20"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              <TrendIcon className="h-4 w-4" />
            </span>
          ) : (
            <span className="rounded-full bg-muted p-2 text-muted-foreground">
              Kč
            </span>
          )
        )
      }
      isLoading={isLoading}
      skeletonClassName={skeletonClassName}
    />
  );
});
