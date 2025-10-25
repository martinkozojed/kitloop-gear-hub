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
import { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";

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

export const TopItemsTable = memo(function TopItemsTable({
  data,
  isLoading,
  title,
  subtitle,
  emptyMessage,
  onViewItem,
  onExport,
}: TopItemsTableProps) {
  const { t } = useTranslation();
  const rankedData = useMemo(() => data, [data]);

  const badgeLabel: Record<PerformanceBadge, string> = useMemo(
    () => ({
      hot: t("provider.analytics.tables.topItems.badges.hot"),
      good: t("provider.analytics.tables.topItems.badges.good"),
      slow: t("provider.analytics.tables.topItems.badges.slow"),
      dead: t("provider.analytics.tables.topItems.badges.dead"),
    }),
    [t]
  );

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
          {t("provider.analytics.tables.topItems.exportCsv")}
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
                  <TableHead>{t("provider.analytics.tables.topItems.columns.item")}</TableHead>
                  <TableHead>{t("provider.analytics.tables.topItems.columns.category")}</TableHead>
                  <TableHead className="text-right">{t("provider.analytics.tables.topItems.columns.reservations")}</TableHead>
                  <TableHead className="text-right">{t("provider.analytics.tables.topItems.columns.revenue")}</TableHead>
                  <TableHead className="text-right">{t("provider.analytics.tables.topItems.columns.lastRental")}</TableHead>
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
                          <span className="font-semibold">{item.gearName ?? t("provider.analytics.tables.topItems.unnamed")}</span>
                          <Badge className={badgeStyle[badge]}>{badgeLabel[badge]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.quantityAvailable != null
                            ? t("provider.analytics.tables.topItems.stockLabel", { count: formatInteger(item.quantityAvailable) })
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
                          ? t("provider.analytics.tables.topItems.lastRented.never")
                          : days === 0
                          ? t("provider.analytics.tables.topItems.lastRented.today")
                          : t("provider.analytics.tables.topItems.lastRented.daysAgo", { days })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewItem?.(item.gearId)}
                        >
                          {t("provider.analytics.tables.topItems.viewButton")}
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
});
