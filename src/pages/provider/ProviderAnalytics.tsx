import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AnalyticsGrid } from "@/components/analytics/layout/AnalyticsGrid";
import { RevenueCard } from "@/components/analytics/cards/RevenueCard";
import { ActiveReservationsCard } from "@/components/analytics/cards/ActiveReservationsCard";
import { UtilizationCard } from "@/components/analytics/cards/UtilizationCard";
import { RevenueTrendChart } from "@/components/analytics/charts/RevenueTrendChart";
import { ReservationStatusChart } from "@/components/analytics/charts/ReservationStatusChart";
import { TopCustomersTable } from "@/components/analytics/tables/TopCustomersTable";
import { MetricCard } from "@/components/analytics/cards/MetricCard";
import { useAnalytics } from "@/hooks/analytics/useAnalytics";
import { useAuth } from "@/context/AuthContext";
import {
  formatInteger,
  formatLongDate,
  formatRelativeTimeFromNow,
} from "@/lib/analytics/formatters";
import { AnalyticsPeriod, TopCustomerStat } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Info, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

const todayLabel = formatLongDate(new Date());

const ProviderAnalytics = () => {
  const { provider } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>("thisMonth");
  const analytics = useAnalytics(provider?.id, period);

  const periodOptions = useMemo(
    () => [
      { value: "last7Days" as AnalyticsPeriod, label: t("provider.analytics.periods.last7Days") },
      { value: "last30Days" as AnalyticsPeriod, label: t("provider.analytics.periods.last30Days") },
      { value: "thisMonth" as AnalyticsPeriod, label: t("provider.analytics.periods.thisMonth") },
      { value: "lastMonth" as AnalyticsPeriod, label: t("provider.analytics.periods.lastMonth") },
    ],
    [t]
  );

  const revenueData = analytics.revenue.comparison;
  const revenueSubtitle = useMemo(() => {
    if (!revenueData) return undefined;
    const start = new Date(revenueData.current.periodStart);
    const end = new Date(revenueData.current.periodEnd);
    end.setDate(end.getDate() - 1);
    return t("provider.analytics.cards.revenue.subtitle", {
      start: formatLongDate(start),
      end: formatLongDate(end),
    });
  }, [revenueData, t]);

  const statusLabels = useMemo(
    () => ({
      hold: t("provider.dashboard.status.hold"),
      pending: t("provider.dashboard.status.pending"),
      confirmed: t("provider.dashboard.status.confirmed"),
      active: t("provider.dashboard.status.active"),
      completed: t("provider.dashboard.status.completed"),
      cancelled: t("provider.dashboard.status.cancelled"),
    }),
    [t]
  );

  const utilizationSubtitle = useMemo(() => {
    if (!analytics.utilization.data) return undefined;
    return t("provider.analytics.cards.utilization.subtitle", {
      active: formatInteger(analytics.utilization.data.activeUnits),
      total: formatInteger(analytics.utilization.data.totalUnits),
    });
  }, [analytics.utilization.data, t]);

  const utilizationInsight = useMemo(() => {
    const metrics = analytics.utilization.data;
    if (!metrics || metrics.totalUnits === 0) return null;
    if (metrics.utilizationRatio < 0.2) {
      return t("provider.analytics.cards.utilization.insightLow");
    }
    if (metrics.utilizationRatio > 0.8) {
      return t("provider.analytics.cards.utilization.insightHigh");
    }
    return null;
  }, [analytics.utilization.data, t]);

  const lastUpdated = useMemo(() => {
    const timestamps = [
      analytics.revenue.comparisonQuery.dataUpdatedAt,
      analytics.revenue.trendQuery.dataUpdatedAt,
      analytics.reservationStatuses.query.dataUpdatedAt,
      analytics.customers.query.dataUpdatedAt,
      analytics.utilization.query.dataUpdatedAt,
    ].filter((value) => value && value > 0) as number[];

    if (!timestamps.length) return null;
    return formatRelativeTimeFromNow(Math.max(...timestamps), i18n.language);
  }, [
    analytics.customers.query.dataUpdatedAt,
    analytics.revenue.comparisonQuery.dataUpdatedAt,
    analytics.revenue.trendQuery.dataUpdatedAt,
    analytics.reservationStatuses.query.dataUpdatedAt,
    analytics.utilization.query.dataUpdatedAt,
    i18n.language,
  ]);

  const handleRefresh = useCallback(() => {
    analytics.revenue.comparisonQuery.refetch();
    analytics.revenue.trendQuery.refetch();
    analytics.reservationStatuses.query.refetch();
    analytics.customers.query.refetch();
    analytics.utilization.query.refetch();
  }, [analytics]);

  const handlePeriodChange = useCallback((value: string) => {
    if (value) {
      setPeriod(value as AnalyticsPeriod);
    }
  }, []);

  const handleStatusSelect = useCallback(
    (status: string) => {
      const params = new URLSearchParams({ status });
      navigate(`/provider/reservations?${params.toString()}`);
    },
    [navigate]
  );

  const handleRevenueDateSelect = useCallback(
    (dateIso: string) => {
      const params = new URLSearchParams({ date: dateIso });
      navigate(`/provider/reservations?${params.toString()}`);
    },
    [navigate]
  );

  const handleCustomerSelect = useCallback(
    (customer: TopCustomerStat) => {
      const params = new URLSearchParams();
      if (customer.customerEmail) {
        params.set("email", customer.customerEmail);
      } else {
        params.set("customer", customer.customerName);
      }
      navigate(`/provider/reservations?${params.toString()}`);
    },
    [navigate]
  );

  const handleExportCustomers = useCallback(() => {
    if (!analytics.customers.data?.length) {
      return;
    }

    const header = "Customer,Email,Phone,Reservations,RevenueCZK";
    const rows = analytics.customers.data.map((customer) =>
      [
        customer.customerName,
        customer.customerEmail ?? "",
        customer.customerPhone ?? "",
        customer.reservationCount,
        (customer.totalCents / 100).toFixed(2),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `top-customers-${period}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [analytics.customers.data, period]);

  const revenueIcon = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
          <Info className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("provider.analytics.tooltips.revenue")}
      </TooltipContent>
    </Tooltip>
  );

  const activeReservationsIcon = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="rounded-full bg-blue-50 p-2 text-blue-600">
          <Info className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("provider.analytics.tooltips.activeReservations")}
      </TooltipContent>
    </Tooltip>
  );

  const utilizationIcon = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="rounded-full bg-purple-50 p-2 text-purple-600">
          <Info className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("provider.analytics.tooltips.utilization")}
      </TooltipContent>
    </Tooltip>
  );

  const ratingIcon = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="rounded-full bg-amber-50 p-2 text-amber-500">
          ★
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("provider.analytics.tooltips.rating")}
      </TooltipContent>
    </Tooltip>
  );

  const insightsIcon = (
    <span className="rounded-full bg-sky-50 p-2 text-sky-500">💡</span>
  );

  const errorMessage = analytics.isError
    ? t("provider.analytics.error")
    : null;

  return (
    <ProviderLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-500/70">
                {t("provider.analytics.headline")}
              </p>
              <h1 className="text-3xl font-semibold text-emerald-950">
                {t("provider.analytics.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("provider.analytics.subtitle", { date: todayLabel })}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <ToggleGroup
                type="single"
                value={period}
                onValueChange={handlePeriodChange}
                className="flex rounded-full border border-emerald-100 bg-white p-1 shadow-sm"
              >
                {periodOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="rounded-full px-3 py-1 text-xs font-medium data-[state=on]:bg-emerald-500 data-[state=on]:text-white"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {lastUpdated
                  ? t("provider.analytics.lastUpdated", { time: lastUpdated })
                  : t("provider.analytics.loading")}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefresh}
                      className="h-8 w-8"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("provider.analytics.actions.refresh")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </header>

        <section className="space-y-6">
          <AnalyticsGrid>
            <RevenueCard
              data={analytics.revenue.comparison}
              isLoading={analytics.revenue.comparisonQuery.isLoading}
              title={t("provider.analytics.cards.revenue.title")}
              subtitle={revenueSubtitle}
              trendLabel={t("provider.analytics.cards.revenue.trendLabel")}
              iconComponent={revenueIcon}
            />
            <ActiveReservationsCard
              activeCount={analytics.utilization.data?.activeReservationCount}
              statusStats={analytics.reservationStatuses.data}
              isLoading={analytics.reservationStatuses.query.isLoading}
              title={t("provider.analytics.cards.activeReservations.title")}
              subtitle={t("provider.analytics.cards.activeReservations.subtitle")}
              statusLabels={statusLabels}
              iconComponent={activeReservationsIcon}
            />
            <UtilizationCard
              data={analytics.utilization.data}
              isLoading={analytics.utilization.query.isLoading}
              title={t("provider.analytics.cards.utilization.title")}
              subtitle={utilizationSubtitle ?? undefined}
              insight={utilizationInsight}
              iconComponent={utilizationIcon}
            />
            <MetricCard
              title={t("provider.analytics.cards.rating.title")}
              value={t("provider.analytics.cards.rating.value")}
              subtitle={t("provider.analytics.cards.rating.subtitle")}
              icon={ratingIcon}
            />
          </AnalyticsGrid>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <RevenueTrendChart
            data={analytics.revenue.trend}
            isLoading={analytics.revenue.trendQuery.isLoading}
            title={t("provider.analytics.charts.revenueTrend.title")}
            emptyMessage={t("provider.analytics.charts.revenueTrend.empty")}
            onSelectDate={handleRevenueDateSelect}
          />
          <ReservationStatusChart
            data={analytics.reservationStatuses.data}
            isLoading={analytics.reservationStatuses.query.isLoading}
            title={t("provider.analytics.charts.reservationStatus.title")}
            emptyMessage={t("provider.analytics.charts.reservationStatus.empty")}
            totalLabel={(total) =>
              t("provider.analytics.charts.reservationStatus.total", {
                count: formatInteger(total),
              })
            }
            statusLabels={statusLabels}
            onSelectStatus={handleStatusSelect}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <TopCustomersTable
            data={analytics.customers.data}
            isLoading={analytics.customers.query.isLoading}
            title={t("provider.analytics.tables.topCustomers.title")}
            emptyMessage={t("provider.analytics.tables.topCustomers.empty")}
            columnLabels={{
              customer: t("provider.analytics.tables.topCustomers.columns.customer"),
              email: t("provider.analytics.tables.topCustomers.columns.email"),
              phone: t("provider.analytics.tables.topCustomers.columns.phone"),
              reservations: t("provider.analytics.tables.topCustomers.columns.reservations"),
              revenue: t("provider.analytics.tables.topCustomers.columns.revenue"),
            }}
            onSelectCustomer={handleCustomerSelect}
            onExport={handleExportCustomers}
            exportLabel={t("provider.analytics.actions.exportCustomers")}
          />
          <MetricCard
            title={t("provider.analytics.cards.insights.title")}
            value={t("provider.analytics.cards.insights.value")}
            subtitle={t("provider.analytics.cards.insights.subtitle")}
            icon={insightsIcon}
          />
        </section>
      </div>
    </ProviderLayout>
  );
};

export default ProviderAnalytics;
