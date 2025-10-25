import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { ReservationStatusStat } from "@/lib/analytics/types";
import { chartPalette } from "@/lib/chartConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger } from "@/lib/analytics/formatters";
import { memo } from "react";
import { useTranslation } from "react-i18next";

interface ReservationStatusChartProps {
  data: ReservationStatusStat[];
  isLoading?: boolean;
  title?: string;
  emptyMessage?: string;
  totalLabel?: (total: number) => string;
  statusLabels?: Record<string, string>;
  onSelectStatus?: (status: string) => void;
}

export const ReservationStatusChart = memo(function ReservationStatusChart({
  data,
  isLoading,
  title = "Stav rezervací (posledních 30 dní)",
  emptyMessage = "Zatím žádné rezervace v tomto období.",
  totalLabel = (total) => `Celkem ${formatInteger(total)} rezervací za posledních 30 dní.`,
  statusLabels,
  onSelectStatus,
}: ReservationStatusChartProps) {
  const { t } = useTranslation();
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const labels: Record<string, string> = {
    hold: t("analytics.charts.reservationStatus.statuses.hold"),
    pending: t("analytics.charts.reservationStatus.statuses.pending"),
    confirmed: t("analytics.charts.reservationStatus.statuses.confirmed"),
    active: t("analytics.charts.reservationStatus.statuses.active"),
    completed: t("analytics.charts.reservationStatus.statuses.completed"),
    cancelled: t("analytics.charts.reservationStatus.statuses.cancelled"),
    ...statusLabels,
  };
  const chartData = data.map((item, index) => ({
    name: labels[item.status] ?? item.status,
    value: item.count,
    fill: chartPalette[index % chartPalette.length],
    status: item.status,
  }));

  const chartConfig = Object.fromEntries(
    chartData.map((item) => [
      item.name,
      {
        label: item.name,
        color: item.fill,
      },
    ])
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto h-64 max-w-lg">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) =>
                      `${formatInteger(Number(value))} · ${name}`
                    }
                    hideLabel
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={4}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.fill}
                    style={{ cursor: onSelectStatus ? "pointer" : "default" }}
                    onClick={() => onSelectStatus?.(entry.status)}
                  />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent />}
                verticalAlign="bottom"
              />
            </PieChart>
          </ChartContainer>
        )}
        {!isLoading && total > 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {totalLabel(total)}
          </p>
        )}
      </CardContent>
    </Card>
  );
});
