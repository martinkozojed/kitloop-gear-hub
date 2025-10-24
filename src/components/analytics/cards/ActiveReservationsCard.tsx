import { ReactNode } from "react";
import { CalendarRange } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { ReservationStatusStat } from "@/lib/analytics/types";
import { formatInteger } from "@/lib/analytics/formatters";

interface ActiveReservationsCardProps {
  activeCount?: number;
  statusStats?: ReservationStatusStat[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  statusLabels?: Record<string, string>;
  iconComponent?: ReactNode;
}

export function ActiveReservationsCard({
  activeCount,
  statusStats,
  isLoading,
  title = "Aktivní rezervace",
  subtitle = "Rezervace probíhající právě teď",
  statusLabels,
  iconComponent,
}: ActiveReservationsCardProps) {
  const labels: Record<string, string> = {
    hold: "Blokováno",
    pending: "Čeká",
    confirmed: "Potvrzeno",
    active: "Probíhá",
    completed: "Dokončeno",
    cancelled: "Zrušeno",
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
}
