import { ReactNode } from "react";
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
}

export function RevenueCard({
  data,
  isLoading,
  title = "Tržby (aktuální měsíc)",
  subtitle,
  trendLabel = "vs. minulý měsíc",
  iconComponent,
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
              className={`rounded-full p-2 ${
                changeTone === "positive"
                  ? "bg-emerald-50 text-emerald-600"
                  : changeTone === "negative"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <TrendIcon className="h-4 w-4" />
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 p-2 text-slate-600">
              Kč
            </span>
          )
        )
      }
      isLoading={isLoading}
    />
  );
}
