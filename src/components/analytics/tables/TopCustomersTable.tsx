import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TopCustomerStat } from "@/lib/analytics/types";
import { formatCurrencyCZ, formatInteger } from "@/lib/analytics/formatters";

interface TopCustomersTableProps {
  data: TopCustomerStat[];
  isLoading?: boolean;
  title?: string;
  emptyMessage?: string;
  columnLabels?: {
    customer: string;
    email: string;
    phone: string;
    reservations: string;
    revenue: string;
  };
  onSelectCustomer?: (customer: TopCustomerStat) => void;
  onExport?: () => void;
  exportLabel?: string;
}

export function TopCustomersTable({
  data,
  isLoading,
  title = "Top zákazníci (posledních 90 dní)",
  emptyMessage = "Zatím žádní zákazníci s tržbami v tomto období.",
  columnLabels = {
    customer: "Zákazník",
    email: "Email",
    phone: "Telefon",
    reservations: "Rezervace",
    revenue: "Tržby",
  },
  onSelectCustomer,
  onExport,
  exportLabel = "CSV",
}: TopCustomersTableProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={!data.length || isLoading}
          className="text-xs"
        >
          {exportLabel}
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{columnLabels.customer}</TableHead>
                  <TableHead>{columnLabels.email}</TableHead>
                  <TableHead>{columnLabels.phone}</TableHead>
                  <TableHead className="text-right">
                    {columnLabels.reservations}
                  </TableHead>
                  <TableHead className="text-right">
                    {columnLabels.revenue}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((customer) => (
                  <TableRow
                    key={customer.customerName + customer.customerEmail}
                    className={onSelectCustomer ? "cursor-pointer transition-colors hover:bg-muted/40" : undefined}
                    onClick={() => onSelectCustomer?.(customer)}
                  >
                    <TableCell className="font-medium">
                      {customer.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.customerEmail ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.customerPhone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInteger(customer.reservationCount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrencyCZ(customer.totalCents)}
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
