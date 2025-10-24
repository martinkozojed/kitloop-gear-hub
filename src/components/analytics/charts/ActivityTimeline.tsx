import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityEvent } from "@/lib/analytics/types";
import { formatLongDate } from "@/lib/analytics/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActivityTimelineProps {
  data: ActivityEvent[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
  onViewReservation?: (reservationId: string) => void;
}

const statusTone: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-700",
  hold: "bg-amber-100 text-amber-700",
};

export function ActivityTimeline({
  data,
  isLoading,
  title,
  emptyMessage,
  onViewReservation,
}: ActivityTimelineProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-4">
            {data.map((event) => {
              const eventTime = event.eventTime ? formatLongDate(event.eventTime) : "";
              const itemStatus = event.status?.toLowerCase() ?? "unknown";
              const badgeClass = statusTone[itemStatus] ?? "bg-slate-100 text-slate-700";

              return (
                <li key={event.reservationId} className="relative pl-6">
                  <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-emerald-500" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.gearName ?? "Reservation"}</p>
                        <Badge className={badgeClass}>{event.status ?? "—"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {eventTime}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:items-end">
                      {event.startDate && (
                        <span>Start: {formatLongDate(event.startDate)}</span>
                      )}
                      {event.endDate && (
                        <span>End: {formatLongDate(event.endDate)}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReservation?.(event.reservationId)}
                      >
                        Detail
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
