import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RevenueTrendPoint } from "@/lib/analytics/types";
import {
  formatCurrencyCZ,
  formatShortDateLabel,
} from "@/lib/analytics/formatters";
import { chartPalette } from "@/lib/chartConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";
import { useTranslation } from "react-i18next";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
  title?: string;
  emptyMessage?: string;
  onSelectDate?: (isoDate: string) => void;
}

export const RevenueTrendChart = memo(function RevenueTrendChart({
  data,
  isLoading,
  title = "Vývoj tržeb",
  emptyMessage = "Žádná data za zvolené období.",
  onSelectDate,
}: RevenueTrendChartProps) {
  const { t } = useTranslation();

  const chartConfig = {
    revenue: {
      label: t("analytics.charts.revenueTrend.label"),
      color: chartPalette[0],
    },
  } as const;
  const chartData = data.map((point) => ({
    ...point,
    value: Math.round(point.totalCents / 100),
  }));

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart
              data={chartData}
              onClick={(state) => {
                const label = state?.activeLabel;
                if (label) {
                  onSelectDate?.(String(label));
                }
              }}
            >
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatShortDateLabel(value)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `${Math.floor(value).toLocaleString("cs-CZ")} Kč`}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrencyCZ(Number(value) * 100)}
                    labelFormatter={(label) => formatShortDateLabel(String(label))}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                name={t("analytics.charts.revenueTrend.label")}
                stroke="var(--color-revenue)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
});
