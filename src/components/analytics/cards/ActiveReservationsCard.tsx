import { ReactNode, memo } from "react";
import { CalendarRange } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { ReservationStatusStat } from "@/lib/analytics/types";
import { formatInteger } from "@/lib/analytics/formatters";
import { useTranslation } from "react-i18next";

interface ActiveReservationsCardProps {
  activeCount?: number;
  statusStats?: ReservationStatusStat[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  statusLabels?: Record<string, string>;
  iconComponent?: ReactNode;
}

export const ActiveReservationsCard = memo(function ActiveReservationsCard({
  activeCount,
  statusStats,
  isLoading,
  title = "Aktivní rezervace",
  subtitle = "Rezervace probíhající právě teď",
  statusLabels,
  iconComponent,
}: ActiveReservationsCardProps) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    hold: t("analytics.charts.reservationStatus.statuses.hold"),
    pending: t("analytics.charts.reservationStatus.statuses.pending"),
    confirmed: t("analytics.charts.reservationStatus.statuses.confirmed"),
    active: t("analytics.charts.reservationStatus.statuses.active"),
    completed: t("analytics.charts.reservationStatus.statuses.completed"),
    cancelled: t("analytics.charts.reservationStatus.statuses.cancelled"),
    ...statusLabels,
  };

  return (
    <MetricCard
      title={title}
      value={activeCount !== undefined ? formatInteger(activeCount) : "—"}
      subtitle={subtitle}
      icon={
        iconComponent ?? (
          <span className="rounded-full bg-blue-50 p-2 text-blue-600">
            <CalendarRange className="h-4 w-4" />
          </span>
        )
      }
      isLoading={isLoading}
    >
      {statusStats && statusStats.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {statusStats
            .filter((stat) => ["hold", "confirmed", "active"].includes(stat.status))
            .map((stat) => (
              <div
                key={stat.status}
                className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1"
              >
                <span>{labels[stat.status] ?? stat.status}</span>
                <span className="font-semibold text-slate-700">
                  {formatInteger(stat.count)}
                </span>
              </div>
            ))}
        </div>
      ) : null}
    </MetricCard>
  );
});
