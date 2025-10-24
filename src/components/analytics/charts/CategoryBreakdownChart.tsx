import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryRevenueStat } from "@/lib/analytics/types";
import { formatCurrencyCZ, formatInteger } from "@/lib/analytics/formatters";
import { chartPalette } from "@/lib/chartConfig";

interface CategoryBreakdownChartProps {
  data: CategoryRevenueStat[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
}

export function CategoryBreakdownChart({
  data,
  isLoading,
  title,
  emptyMessage,
}: CategoryBreakdownChartProps) {
  const chartData = data.map((row, index) => ({
    category: row.category,
    revenue: Math.round(row.revenueCents / 100),
    reservations: row.reservationCount,
    fill: chartPalette[index % chartPalette.length],
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => `${Math.floor(Number(value)).toLocaleString("cs-CZ")} Kč`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatInteger(Number(value))}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "revenue") {
                    return formatCurrencyCZ(Number(value) * 100);
                  }
                  return formatInteger(Number(value));
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="var(--color-revenue, #22c55e)"
                name="Revenue"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="reservations"
                fill="var(--color-reservations, #0ea5e9)"
                name="Reservations"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
