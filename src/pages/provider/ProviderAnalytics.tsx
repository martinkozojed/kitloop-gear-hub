import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AnalyticsGrid } from "@/components/analytics/layout/AnalyticsGrid";
import { RevenueCard } from "@/components/analytics/cards/RevenueCard";
import { ActiveReservationsCard } from "@/components/analytics/cards/ActiveReservationsCard";
import { UtilizationCard } from "@/components/analytics/cards/UtilizationCard";
import { MetricCard } from "@/components/analytics/cards/MetricCard";
import { CustomerKpiCards } from "@/components/analytics/cards/CustomerKpiCards";
import { RevenueTrendChart } from "@/components/analytics/charts/RevenueTrendChart";
import { ReservationStatusChart } from "@/components/analytics/charts/ReservationStatusChart";
import { CategoryBreakdownChart } from "@/components/analytics/charts/CategoryBreakdownChart";
import { ActivityTimeline } from "@/components/analytics/charts/ActivityTimeline";
import { UtilizationHeatmap } from "@/components/analytics/charts/UtilizationHeatmap";
import { TopCustomersTable } from "@/components/analytics/tables/TopCustomersTable";
import { TopItemsTable } from "@/components/analytics/tables/TopItemsTable";
import { DeadInventoryTable } from "@/components/analytics/tables/DeadInventoryTable";
import { useAnalytics } from "@/hooks/analytics/useAnalytics";
import { useTopItems } from "@/hooks/analytics/useTopItems";
import { useCategoryRevenue } from "@/hooks/analytics/useCategoryRevenue";
import { useDeadInventory } from "@/hooks/analytics/useDeadInventory";
import { useActivityFeed } from "@/hooks/analytics/useActivityFeed";
import { useUtilizationHeatmap } from "@/hooks/analytics/useUtilizationHeatmap";
import { useCustomerKpis } from "@/hooks/analytics/useCustomerKpis";
import { useAuth } from "@/context/AuthContext";
import {
  formatInteger,
  formatLongDate,
  formatRelativeTimeFromNow,
} from "@/lib/analytics/formatters";
import { exportToCsv } from "@/lib/analytics/csvExport";
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
  const activeRange = analytics.revenue.comparisonRange.current;
  const topItems = useTopItems(provider?.id, 10);
  const categoryRevenue = useCategoryRevenue(provider?.id);
  const deadInventory = useDeadInventory(provider?.id, 30, 25);
  const activityFeed = useActivityFeed(provider?.id, 30);
  const utilizationHeatmap = useUtilizationHeatmap(provider?.id, activeRange);
  const customerKpis = useCustomerKpis(provider?.id, activeRange);
  const topItemsQuery = topItems.query;
  const categoryRevenueQuery = categoryRevenue.query;
  const deadInventoryQuery = deadInventory.query;
  const activityFeedQuery = activityFeed.query;
  const utilizationHeatmapQuery = utilizationHeatmap.query;
  const customerKpisQuery = customerKpis.query;

  const revenueComparisonUpdatedAt = analytics.revenue.comparisonQuery.dataUpdatedAt;
  const revenueTrendUpdatedAt = analytics.revenue.trendQuery.dataUpdatedAt;
  const statusUpdatedAt = analytics.reservationStatuses.query.dataUpdatedAt;
  const customersUpdatedAt = analytics.customers.query.dataUpdatedAt;
  const utilizationUpdatedAt = analytics.utilization.query.dataUpdatedAt;
  const topItemsUpdatedAt = topItemsQuery.dataUpdatedAt;
  const categoryRevenueUpdatedAt = categoryRevenueQuery.dataUpdatedAt;
  const deadInventoryUpdatedAt = deadInventoryQuery.dataUpdatedAt;
  const activityFeedUpdatedAt = activityFeedQuery.dataUpdatedAt;
  const utilizationHeatmapUpdatedAt = utilizationHeatmapQuery.dataUpdatedAt;
  const customerKpisUpdatedAt = customerKpisQuery.dataUpdatedAt;

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

  const timestamps = [
    revenueComparisonUpdatedAt,
    revenueTrendUpdatedAt,
    statusUpdatedAt,
    customersUpdatedAt,
    utilizationUpdatedAt,
    topItemsUpdatedAt,
    categoryRevenueUpdatedAt,
    deadInventoryUpdatedAt,
    activityFeedUpdatedAt,
    utilizationHeatmapUpdatedAt,
    customerKpisUpdatedAt,
  ].filter((value) => value && value > 0) as number[];

  const lastUpdated = timestamps.length
    ? formatRelativeTimeFromNow(Math.max(...timestamps), i18n.language)
    : null;

  const handleRefresh = useCallback(() => {
    analytics.revenue.comparisonQuery.refetch();
    analytics.revenue.trendQuery.refetch();
    analytics.reservationStatuses.query.refetch();
    analytics.customers.query.refetch();
    analytics.utilization.query.refetch();
    topItemsQuery.refetch();
    categoryRevenueQuery.refetch();
    deadInventoryQuery.refetch();
    activityFeedQuery.refetch();
    utilizationHeatmapQuery.refetch();
    customerKpisQuery.refetch();
  }, [
    analytics.customers.query,
    analytics.reservationStatuses.query,
    analytics.revenue.comparisonQuery,
    analytics.revenue.trendQuery,
    analytics.utilization.query,
    topItemsQuery,
    categoryRevenueQuery,
    deadInventoryQuery,
    activityFeedQuery,
    utilizationHeatmapQuery,
    customerKpisQuery,
  ]);

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

  const handleViewItem = useCallback(
    (gearId: string) => {
      const params = new URLSearchParams({ highlight: gearId });
      navigate(`/provider/inventory?${params.toString()}`);
    },
    [navigate]
  );

  const handleViewReservation = useCallback(
    (reservationId: string) => {
      const params = new URLSearchParams({ highlight: reservationId });
      navigate(`/provider/reservations?${params.toString()}`);
    },
    [navigate]
  );

  const handleExportCustomers = useCallback(() => {
    if (!analytics.customers.data?.length) {
      return;
    }

    exportToCsv({
      filename: `top-customers-${period}`,
      headers: ["Customer", "Email", "Phone", "Reservations", "RevenueCZK"],
      rows: analytics.customers.data.map((customer) => [
        customer.customerName,
        customer.customerEmail ?? "",
        customer.customerPhone ?? "",
        customer.reservationCount,
        (customer.totalCents / 100).toFixed(2),
      ]),
    });
  }, [analytics.customers.data, period]);

  const handleExportTopItems = useCallback(() => {
    if (!topItems.data.length) return;

    exportToCsv({
      filename: `top-items-${period}`,
      headers: ["Rank", "Item", "Category", "RevenueCZK", "Reservations", "LastRentedAt"],
      rows: topItems.data.map((item, idx) => [
        idx + 1,
        item.gearName ?? "",
        item.category ?? "",
        (item.revenueCents / 100).toFixed(2),
        item.reservationCount,
        item.lastRentedAt ?? "",
      ]),
    });
  }, [period, topItems.data]);

  const handleExportDeadInventory = useCallback(() => {
    if (!deadInventory.data.length) return;

    exportToCsv({
      filename: `dead-inventory-${period}`,
      headers: ["Item", "Category", "DaysSinceLast", "Reservations"],
      rows: deadInventory.data.map((item) => [
        item.gearName ?? "",
        item.category ?? "",
        item.daysSinceLastRental ?? "",
        item.reservationCount,
      ]),
    });
  }, [deadInventory.data, period]);

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
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
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
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
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
        <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">★</span>
      </TooltipTrigger>
      <TooltipContent>
        {t("provider.analytics.tooltips.rating")}
      </TooltipContent>
    </Tooltip>
  );

  const insightsIcon = <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">💡</span>;

  const hasAnyError =
    analytics.isError ||
    topItemsQuery.isError ||
    categoryRevenueQuery.isError ||
    deadInventoryQuery.isError ||
    activityFeedQuery.isError ||
    utilizationHeatmapQuery.isError ||
    customerKpisQuery.isError;

  const errorMessage = hasAnyError
    ? t("provider.analytics.error")
    : null;

  return (
    <ProviderLayout>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold text-emerald-950">
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
                className="flex rounded-full border border-emerald-100 bg-white p-1 shadow-[0_10px_25px_-18px_rgba(16,185,129,0.45)]"
              >
                {periodOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="rounded-full px-3 py-1 text-xs font-medium data-[state=on]:bg-gradient-to-r data-[state=on]:from-[#4FCB84] data-[state=on]:via-[#43B273] data-[state=on]:to-[#2F8C55] data-[state=on]:text-white data-[state=on]:shadow-[0_14px_35px_-20px_rgba(41,120,72,0.65)] data-[state=on]:hover:from-[#47BC79] data-[state=on]:hover:via-[#3FA467] data-[state=on]:hover:to-[#297A4B]"
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
                      className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
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
              skeletonClassName="h-[140px]"
            />
            <ActiveReservationsCard
              activeCount={analytics.utilization.data?.activeReservationCount}
              statusStats={analytics.reservationStatuses.data}
              isLoading={analytics.reservationStatuses.query.isLoading}
              title={t("provider.analytics.cards.activeReservations.title")}
              subtitle={t("provider.analytics.cards.activeReservations.subtitle")}
              statusLabels={statusLabels}
              iconComponent={activeReservationsIcon}
              skeletonClassName="h-[140px]"
            />
            <UtilizationCard
              data={analytics.utilization.data}
              isLoading={analytics.utilization.query.isLoading}
              title={t("provider.analytics.cards.utilization.title")}
              subtitle={utilizationSubtitle ?? undefined}
              insight={utilizationInsight}
              iconComponent={utilizationIcon}
              skeletonClassName="h-[140px]"
            />
            <MetricCard
              title={t("provider.analytics.cards.rating.title")}
              value={t("provider.analytics.cards.rating.value")}
              subtitle={t("provider.analytics.cards.rating.subtitle")}
              icon={ratingIcon}
              isLoading={analytics.isLoading}
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
          <TopItemsTable
            data={topItems.data}
            isLoading={topItemsQuery.isLoading}
            title={t("provider.analytics.tables.topItems.title")}
            subtitle={t("provider.analytics.tables.topItems.subtitle")}
            emptyMessage={t("provider.analytics.tables.topItems.empty")}
            onViewItem={handleViewItem}
            onExport={handleExportTopItems}
          />
          <CategoryBreakdownChart
            data={categoryRevenue.data}
            isLoading={categoryRevenueQuery.isLoading}
            title={t("provider.analytics.charts.categoryBreakdown.title")}
            emptyMessage={t("provider.analytics.charts.categoryBreakdown.empty")}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <DeadInventoryTable
            data={deadInventory.data}
            isLoading={deadInventoryQuery.isLoading}
            title={t("provider.analytics.tables.deadInventory.title")}
            thresholdLabel={t("provider.analytics.tables.deadInventory.threshold")}
            emptyMessage={t("provider.analytics.tables.deadInventory.empty")}
            onViewItem={handleViewItem}
            onExport={handleExportDeadInventory}
          />
          <CustomerKpiCards
            data={customerKpis.data}
            isLoading={customerKpisQuery.isLoading}
            title={t("provider.analytics.cards.customerKpis.title")}
            subtitles={{
              aov: t("provider.analytics.cards.customerKpis.aov"),
              repeat: t("provider.analytics.cards.customerKpis.repeat"),
              deposit: t("provider.analytics.cards.customerKpis.deposit"),
              counts: t("provider.analytics.cards.customerKpis.counts"),
            }}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ActivityTimeline
            data={activityFeed.data}
            isLoading={activityFeedQuery.isLoading}
            title={t("provider.analytics.charts.activityTimeline.title")}
            emptyMessage={t("provider.analytics.charts.activityTimeline.empty")}
            onViewReservation={handleViewReservation}
          />
          <UtilizationHeatmap
            data={utilizationHeatmap.data}
            isLoading={utilizationHeatmapQuery.isLoading}
            title={t("provider.analytics.charts.utilizationHeatmap.title")}
            emptyMessage={t("provider.analytics.charts.utilizationHeatmap.empty")}
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
