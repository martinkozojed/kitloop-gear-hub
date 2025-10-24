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

interface DeadInventoryTableProps {
  data: DeadInventoryStat[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
  thresholdLabel: string;
  onViewItem?: (gearId: string) => void;
  onExport?: () => void;
}

export function DeadInventoryTable({
  data,
  isLoading,
  title,
  emptyMessage,
  thresholdLabel,
  onViewItem,
  onExport,
}: DeadInventoryTableProps) {
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
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : !data.length ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Days since last rental</TableHead>
                  <TableHead className="text-right">Reservations total</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.gearId}>
                    <TableCell className="font-medium">{item.gearName ?? "Unknown"}</TableCell>
                    <TableCell>{item.category ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {item.daysSinceLastRental === null
                        ? "Never"
                        : `${formatInteger(item.daysSinceLastRental)} days`}
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
                        Open
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
}
