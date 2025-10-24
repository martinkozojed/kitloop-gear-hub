import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UtilizationHeatmapPoint } from "@/lib/analytics/types";
import { useMemo } from "react";

interface UtilizationHeatmapProps {
  data: UtilizationHeatmapPoint[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
}

const intensityColors = [
  "#ecfdf5",
  "#d1fae5",
  "#a7f3d0",
  "#6ee7b7",
  "#34d399",
  "#10b981",
  "#059669",
];

export function UtilizationHeatmap({
  data,
  isLoading,
  title,
  emptyMessage,
}: UtilizationHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!data.length) return [];

    const maxRatio = Math.max(
      ...data.map((point) =>
        point.totalUnits > 0 ? point.activeUnits / point.totalUnits : 0
      )
    );

    return data.map((point) => {
      const ratio = point.totalUnits > 0 ? point.activeUnits / point.totalUnits : 0;
      const intensity = Math.min(
        intensityColors.length - 1,
        Math.round((ratio / (maxRatio || 1)) * (intensityColors.length - 1))
      );

      return {
        ...point,
        ratio,
        color: intensityColors[intensity],
      };
    });
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : heatmapData.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 text-xs">
            {heatmapData.map((point) => (
              <div
                key={point.date}
                className="flex h-12 flex-col items-center justify-center rounded"
                style={{ backgroundColor: point.color }}
              >
                <span className="font-semibold text-slate-700">
                  {new Date(point.date).getDate()}
                </span>
                <span className="text-[10px] text-slate-600">
                  {Math.round(point.ratio * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
