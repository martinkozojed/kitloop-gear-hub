import { ReactNode, memo } from "react";
import { Activity } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { UtilizationMetrics } from "@/lib/analytics/types";
import { formatInteger, formatPercent } from "@/lib/analytics/formatters";

interface UtilizationCardProps {
  data?: UtilizationMetrics;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  insight?: string | null;
  iconComponent?: ReactNode;
  skeletonClassName?: string;
}

export const UtilizationCard = memo(function UtilizationCard({
  data,
  isLoading,
  title = "Vytížení inventáře",
  subtitle,
  insight,
  iconComponent,
  skeletonClassName,
}: UtilizationCardProps) {
  const utilization = data ? formatPercent(data.utilizationRatio) : "—";

  return (
    <MetricCard
      title={title}
      value={utilization}
      subtitle={
        data
          ? subtitle ??
          `${formatInteger(data.activeUnits)} z ${formatInteger(
            data.totalUnits
          )} jednotek využito`
          : subtitle ?? "Sledujeme aktivní rezervace proti dostupným jednotkám."
      }
      icon={
        iconComponent ?? (
          <span className="rounded-full bg-purple-50 p-2 text-purple-600">
            <Activity className="h-4 w-4" />
          </span>
        )
      }
      isLoading={isLoading}
      skeletonClassName={skeletonClassName}
    >
      {insight ? (
        <p className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1">
          {insight}
        </p>
      ) : null}
    </MetricCard>
  );
});
