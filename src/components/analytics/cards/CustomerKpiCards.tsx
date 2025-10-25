import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerKpis } from "@/lib/analytics/types";
import { formatCurrencyCZ, formatInteger, formatPercent } from "@/lib/analytics/formatters";
import { memo } from "react";

interface CustomerKpiCardsProps {
  data?: CustomerKpis;
  isLoading?: boolean;
  title: string;
  subtitles: {
    aov: string;
    repeat: string;
    deposit: string;
    counts: string;
  };
}

export const CustomerKpiCards = memo(function CustomerKpiCards({ data, isLoading, title, subtitles }: CustomerKpiCardsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : !data ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <>
            <div className="rounded-xl border border-border/70 bg-white/60 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{subtitles.aov}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrencyCZ(data.averageOrderValueCents)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-white/60 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{subtitles.deposit}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatPercent(data.depositRate)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-white/60 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{subtitles.repeat}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatPercent(data.repeatCustomerRate)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-white/60 p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{subtitles.counts}</p>
              <p className="mt-2 text-lg font-semibold">
                {formatInteger(data.totalCustomers)} customers • {formatInteger(data.totalReservations)} reservations
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
});
