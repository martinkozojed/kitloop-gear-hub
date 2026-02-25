import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Package, ExternalLink, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBadgeVariant, getStatusLabelKey } from '@/lib/status-colors';
import { AgendaItemProps, ExceptionItem } from '@/types/dashboard';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={getBadgeVariant(status)} className="text-xs shrink-0">
      {t(getStatusLabelKey(status))}
    </Badge>
  );
}

function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return '';
  try {
    const s = format(parseISO(start), 'd.M.', { locale: cs });
    const e = format(parseISO(end), 'd.M.', { locale: cs });
    return `${s} – ${e}`;
  } catch {
    return '';
  }
}

// ---- Shared row component ----

interface ReservationRowProps {
  reservationId: string;
  customerName: string;
  startDate?: string;
  endDate?: string;
  status: string;
}

function ReservationRow({ reservationId, customerName, startDate, endDate, status }: ReservationRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{customerName}</p>
        <p className="text-xs text-muted-foreground">{formatDateRange(startDate, endDate)}</p>
      </div>
      <StatusBadge status={status} />
      <Button asChild variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs">
        <Link to={`/provider/reservations/edit/${reservationId}`}>
          <ExternalLink className="w-3 h-3 mr-1" />
          Otevřít
        </Link>
      </Button>
    </div>
  );
}

// ---- Section component ----

interface SectionProps {
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
  highlight?: boolean;
}

function Section({ title, count, emptyText, children, highlight }: SectionProps) {
  return (
    <Card
      padding="compact"
      className={highlight && count > 0 ? 'border-destructive/40 bg-destructive/5' : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          {highlight && count > 0 && <AlertTriangle className="w-4 h-4 text-destructive" />}
          {title}
        </h3>
        {count > 0 && (
          <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
      ) : (
        <div>{children}</div>
      )}
    </Card>
  );
}

// ---- Main ActionCenter ----

interface ActionCenterProps {
  agendaItems: AgendaItemProps[];
  exceptions: ExceptionItem[];
}

export function ActionCenter({ agendaItems, exceptions }: ActionCenterProps) {
  const { t } = useTranslation();
  const pickups = agendaItems.filter(i => i.type === 'pickup');
  const returns = agendaItems.filter(i => i.type === 'return');
  const overdue = exceptions.filter(e => e.type === 'overdue');

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/provider/reservations/new">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('dashboard.cta.createReservation')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/provider/inventory/new">
            <Package className="w-4 h-4 mr-1.5" />
            {t('dashboard.cta.addGear')}
          </Link>
        </Button>
      </div>

      {/* Three sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Section
          title={t('dashboard.actionCenter.todaysPickups')}
          count={pickups.length}
          emptyText={t('dashboard.actionCenter.noPickupsToday')}
        >
          {pickups.map(item => (
            <ReservationRow
              key={item.reservationId}
              reservationId={item.reservationId}
              customerName={item.customerName}
              startDate={item.startDate}
              endDate={item.endDate}
              status={item.status}
            />
          ))}
        </Section>

        <Section
          title={t('dashboard.actionCenter.todaysReturns')}
          count={returns.length}
          emptyText={t('dashboard.actionCenter.noReturnsToday')}
        >
          {returns.map(item => (
            <ReservationRow
              key={item.reservationId}
              reservationId={item.reservationId}
              customerName={item.customerName}
              startDate={item.startDate}
              endDate={item.endDate}
              status={item.status}
            />
          ))}
        </Section>

        <Section
          title={t('dashboard.actionCenter.overdue')}
          count={overdue.length}
          emptyText={t('dashboard.actionCenter.noOverdue')}
          highlight
        >
          {overdue.map(item => (
            <ReservationRow
              key={item.id}
              reservationId={item.id}
              customerName={item.customer}
              status="active"
            />
          ))}
        </Section>
      </div>
    </div>
  );
}
