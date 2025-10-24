import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TopItemPerformance } from "@/lib/analytics/types";
import { formatCurrencyCZ, formatInteger } from "@/lib/analytics/formatters";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface TopItemsTableProps {
  data: TopItemPerformance[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
  onViewItem?: (gearId: string) => void;
  onExport?: () => void;
  subtitle?: string;
}

type PerformanceBadge = "hot" | "good" | "slow" | "dead";

function getPerformanceBadge(item: TopItemPerformance): PerformanceBadge {
  if (item.reservationCount === 0) {
    return "dead";
  }
  if (item.reservationCount >= 10) {
    return "hot";
  }
  if (item.reservationCount >= 4) {
    return "good";
  }
  return "slow";
}

const badgeStyle: Record<PerformanceBadge, string> = {
  hot: "bg-rose-100 text-rose-700",
  good: "bg-emerald-100 text-emerald-700",
  slow: "bg-amber-100 text-amber-700",
  dead: "bg-slate-200 text-slate-600",
};

const badgeLabel: Record<PerformanceBadge, string> = {
  hot: "🔥 Hot",
  good: "👍 Good",
  slow: "💤 Slow",
  dead: "⚠️ Dead",
};

export function TopItemsTable({
  data,
  isLoading,
  title,
  subtitle,
  emptyMessage,
  onViewItem,
  onExport,
}: TopItemsTableProps) {
  const rankedData = useMemo(() => data, [data]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {subtitle ? (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={!data.length || isLoading}
          className="text-xs"
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : rankedData.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Reservations</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Last rental</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedData.map((item, index) => {
                  const badge = getPerformanceBadge(item);
                  const days = item.lastRentedAt
                    ? Math.floor(
                        (Date.now() - new Date(item.lastRentedAt).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;

                  return (
                    <TableRow key={item.gearId}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.gearName ?? "Unnamed"}</span>
                          <Badge className={badgeStyle[badge]}>{badgeLabel[badge]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.quantityAvailable != null
                            ? `${formatInteger(item.quantityAvailable)} ks skladem`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell>{item.category ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatInteger(item.reservationCount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrencyCZ(item.revenueCents)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {days === null
                          ? "Never"
                          : days === 0
                          ? "Today"
                          : `${days} days ago`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewItem?.(item.gearId)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
