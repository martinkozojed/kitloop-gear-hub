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
import { Button } from "@/components/ui/button";
import { DeadInventoryStat } from "@/lib/analytics/types";
import { formatInteger } from "@/lib/analytics/formatters";
import { useTranslation } from "react-i18next";
import { memo } from "react";

interface DeadInventoryTableProps {
  data: DeadInventoryStat[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
  thresholdLabel: string;
  onViewItem?: (gearId: string) => void;
  onExport?: () => void;
}

export const DeadInventoryTable = memo(function DeadInventoryTable({
  data,
  isLoading,
  title,
  emptyMessage,
  thresholdLabel,
  onViewItem,
  onExport,
}: DeadInventoryTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{thresholdLabel}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={!data.length || isLoading}
          className="text-xs"
        >
          {t("provider.analytics.tables.deadInventory.exportCsv")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : !data.length ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("provider.analytics.tables.deadInventory.columns.item")}</TableHead>
                  <TableHead>{t("provider.analytics.tables.deadInventory.columns.category")}</TableHead>
                  <TableHead className="text-right">{t("provider.analytics.tables.deadInventory.columns.daysSince")}</TableHead>
                  <TableHead className="text-right">{t("provider.analytics.tables.deadInventory.columns.reservationsTotal")}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.gearId}>
                    <TableCell className="font-medium">{item.gearName ?? t("provider.analytics.tables.deadInventory.unknown")}</TableCell>
                    <TableCell>{item.category ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {item.daysSinceLastRental === null
                        ? t("provider.analytics.tables.deadInventory.never")
                        : t("provider.analytics.tables.deadInventory.daysCount", { days: formatInteger(item.daysSinceLastRental) })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInteger(item.reservationCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewItem?.(item.gearId)}
                      >
                        {t("provider.analytics.tables.deadInventory.openButton")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
