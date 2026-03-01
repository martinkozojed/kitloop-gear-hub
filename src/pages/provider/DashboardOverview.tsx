import React, { useState, useMemo } from 'react';
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ExceptionsQueue } from "@/components/dashboard/ExceptionsQueue";
import { AgendaRow } from "@/components/dashboard/AgendaRow";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { AgendaItemProps } from "@/types/dashboard";
import { IssueFlow } from "@/components/operations/IssueFlow";
import { ReturnFlow } from "@/components/operations/ReturnFlow";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Link } from 'react-router-dom';
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePermissions } from "@/hooks/usePermissions";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { CustomerDetailSheet } from "@/components/crm/CustomerDetailSheet";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutDashboard, ListTodo, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { BookingRequestsWidget } from "@/components/dashboard/BookingRequestsWidget";
import { toast } from "sonner";
import { PageLoadingSkeleton } from "@/components/ui/loading-state";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { enUS } from "date-fns/locale";

const numberFormatter = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0
});

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { canViewFinancials } = usePermissions();
  const { t, i18n } = useTranslation();
  const { provider } = useAuth();

  // Use Custom Hook for Data & Mutations
  const {
    kpiData,
    agendaItems,
    exceptions,
    isLoading,
    issueReservation,
    returnReservation,
    refresh
  } = useDashboardData();

  // --- UI State (Modals) ---
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState<AgendaItemProps | null>(null);

  // CRM Sheet State
  const [crmSheetOpen, setCrmSheetOpen] = useState(false);
  const [selectedCrmId, setSelectedCrmId] = useState<string | null>(null);

  // --- View Mode State (Persisted) ---
  const [viewMode, setViewMode] = useState<'overview' | 'operations'>(() => {
    return (localStorage.getItem('dashboard.viewMode') as 'overview' | 'operations') || 'overview';
  });

  const handleViewChange = (val: string) => {
    if (val) {
      setViewMode(val as 'overview' | 'operations');
      localStorage.setItem('dashboard.viewMode', val);
    }
  };

  // --- Agenda Tab State ---
  const [agendaTab, setAgendaTab] = useState<'all' | 'pickups' | 'returns'>('all');

  // Filter agenda items based on selected tab
  const filteredAgendaItems = useMemo(() => {
    if (agendaTab === 'all') return agendaItems;
    if (agendaTab === 'pickups') return agendaItems.filter(item => item.type === 'pickup');
    return agendaItems.filter(item => item.type === 'return');
  }, [agendaItems, agendaTab]);

  // Count pickups and returns for tab labels
  const pickupsCount = useMemo(() => agendaItems.filter(item => item.type === 'pickup').length, [agendaItems]);
  const returnsCount = useMemo(() => agendaItems.filter(item => item.type === 'return').length, [agendaItems]);

  // Memoize greeting to avoid recalculating on every render
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.header.greeting.morning');
    if (hour < 18) return t('dashboard.header.greeting.afternoon');
    return t('dashboard.header.greeting.evening');
  }, [t]); // Empty deps = calculate once on mount

  const currentLocale = i18n.language.startsWith('cs') ? cs : enUS;

  // --- Handlers ---
  const handleIssueClick = (reservation: AgendaItemProps) => {
    setActiveReservation(reservation);
    setIssueOpen(true);
  };

  const handleReturnClick = (reservation: AgendaItemProps) => {
    setActiveReservation(reservation);
    setReturnOpen(true);
  };

  const handleCustomerClick = (crmId: string) => {
    setSelectedCrmId(crmId);
    setCrmSheetOpen(true);
  };

  const executeIssue = async (id: string, isOverride: boolean) => {
    // Note: Hook already handles errors with optimistic rollback and error toast
    // We only add success feedback here
    await issueReservation({ id, isOverride });

    toast.success(t('ssot.toasts.issue_completed.title'), {
      description: t('ssot.toasts.issue_completed.desc')
    });
    setIssueOpen(false);
  };

  const executeReturn = async (id: string, damage: boolean) => {
    // Note: Hook already handles errors with optimistic rollback and error toast
    // We only add success feedback here
    await returnReservation({ id, damage });

    const toastKey = damage ? 'ssot.toasts.return_with_damage' : 'ssot.toasts.return_completed';
    toast.success(t(`${toastKey}.title`), {
      description: t(`${toastKey}.desc`)
    });
    setReturnOpen(false);
  };

  if (isLoading && !kpiData.activeRentals) {
    return (
      <ProviderLayout>
        <PageLoadingSkeleton />
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <TooltipProvider>
        <div className="space-y-3 pt-0">
          {/* Demo Data Banner (if using demo) */}
          {provider?.id && import.meta.env.VITE_ENABLE_DEMO === 'true' && (
            <DemoBanner
              providerId={provider.id}
              onDemoDeleted={() => window.location.reload()}
            />
          )}

          {/* Pending Requests Widget (Phase 4) */}
          {provider?.id && (
            <div className="mb-6">
              <BookingRequestsWidget providerId={provider.id} />
            </div>
          )}

          {/* 1. Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 animate-fade-in -mt-3 sm:-mt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <span>{t('dashboard.header.missionControl')}</span>
                <SyncIndicator />
              </div>
              <h1 className="text-3xl lg:text-4xl font-heading font-bold tracking-tight text-foreground flex items-center gap-2">
                {greeting}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-foreground/80 font-medium">
                  {format(new Date(), "EEEE, d. MMMM", { locale: currentLocale })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">

              {/* VIEW TOGGLE */}
              <div className="mr-2 border-r pr-2 shadow-sm">
                <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange}>
                  <ToggleGroupItem value="overview" aria-label="Overview Mode">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icon icon={LayoutDashboard} />
                      </TooltipTrigger>
                      <TooltipContent>{t('dashboard.view.overview')}</TooltipContent>
                    </Tooltip>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="operations" aria-label="Operations Mode">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Icon icon={ListTodo} />
                      </TooltipTrigger>
                      <TooltipContent>{t('dashboard.view.operations')}</TooltipContent>
                    </Tooltip>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* REFRESH */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={isLoading}>
                    <Icon icon={RefreshCw} className={isLoading ? 'animate-spin' : ''} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('dashboard.cta.refresh')}</TooltipContent>
              </Tooltip>

              {/* FILTER - TODO: Implement filtering functionality */}
              {/* Temporarily removed to avoid misleading UI */}

              {/* NEW RESERVATION */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild>
                    <Link to="/provider/reservations/new">
                      <Icon icon={Plus} className="mr-2" />
                      {t('dashboard.cta.newReservation')}
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('dashboard.cta.newReservation')}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 2. Action Center */}
          <ActionCenter agendaItems={agendaItems} exceptions={exceptions} />

          {/* 3. KPI Strip (Hidden in Operations Mode or Restricted) */}
          {viewMode === 'overview' && canViewFinancials && (
            <KpiStrip data={kpiData} />
          )}

          {/* 3. Main Operational Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Main Column: Agenda (Taking 8 cols) */}
            <Card className="lg:col-span-8 xl:col-span-9 min-h-[600px] flex flex-col" padding="default">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-foreground">
                    {viewMode === 'operations' ? t('dashboard.agenda.titleOperations') : t('dashboard.agenda.titleOverview')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.agenda.subtitle')}</p>
                </div>

                {/* Visual Tab Switcher (Functional) */}
                <div className="flex bg-muted p-1 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 text-xs font-semibold ${agendaTab === 'all' ? 'shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('all')}
                  >
                    {t('dashboard.agenda.tabs.all')} <span className="ml-1 opacity-50">({agendaItems.length})</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 text-xs ${agendaTab === 'pickups' ? 'font-semibold shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('pickups')}
                  >
                    {t('dashboard.agenda.tabs.pickups')} <span className="ml-1 opacity-50">({pickupsCount})</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 text-xs ${agendaTab === 'returns' ? 'font-semibold shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('returns')}
                  >
                    {t('dashboard.agenda.tabs.returns')} <span className="ml-1 opacity-50">({returnsCount})</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {filteredAgendaItems.map((item, idx) => (
                  <AgendaRow
                    key={idx}
                    data={item}
                    onIssue={handleIssueClick}
                    onReturn={handleReturnClick}
                    onCustomerClick={handleCustomerClick}
                  />
                ))}

                {filteredAgendaItems.length === 0 && agendaItems.length === 0 && (
                  <EmptyState
                    icon={CheckCircle2}
                    title={t('dashboard.agenda.emptyAllTitle')}
                    description={t('dashboard.agenda.emptyAllDesc')}
                    action={{
                      label: t('dashboard.cta.createReservation'),
                      onClick: () => navigate('/provider/reservations/new')
                    }}
                    className="h-full items-center justify-center border-2 border-dashed border-muted bg-muted rounded-xl"
                  />
                )}

                {filteredAgendaItems.length === 0 && agendaItems.length > 0 && (
                  <EmptyState
                    icon={CheckCircle2}
                    title={t('dashboard.agenda.emptyTabTitle', { tab: t(`dashboard.agenda.tabs.${agendaTab}`) })}
                    description={t('dashboard.agenda.emptyTabDesc')}
                    className="h-full items-center justify-center border-2 border-dashed border-muted bg-muted rounded-xl"
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Exceptions & Notes (Taking 4 cols) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6" id="exceptions-panel">
            {/* Onboarding Checklist - shows until dismissed */}
            {provider?.id && (
              <OnboardingChecklist
                providerId={provider.id}
                hasInventory={(kpiData.activeRentals ?? 0) > 0}
                hasReservation={agendaItems.length > 0}
              />
            )}

            <ExceptionsQueue exceptions={exceptions} />

            <Card padding="compact" className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Icon icon={LayoutDashboard} className="text-muted-foreground" /> {t('dashboard.quickStats.title')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-status-success/10 rounded-lg border border-status-success/20">
                  <div className="text-xs text-muted-foreground uppercase font-bold">{t('dashboard.quickStats.revenue')}</div>
                  <div className="text-lg font-bold text-status-success">
                    {currencyFormatter.format(kpiData.dailyRevenue || 0)}
                  </div>
                </div>
                <div className="p-3 bg-status-success/10 rounded-lg border border-status-success/20">
                  <div className="text-xs text-muted-foreground uppercase font-bold">{t('dashboard.quickStats.active')}</div>
                  <div className="text-lg font-bold text-status-success">
                    {numberFormatter.format(kpiData.activeRentals || 0)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {viewMode === 'overview' && (
            <div className="p-4 rounded-lg border border-status-warning/20 bg-status-warning/10 border-dashed text-center text-sm text-status-warning">
              {t('dashboard.notesPlaceholder')}
            </div>
          )}
        </div>

        {/* MODALS */}
        {activeReservation && (
          <>
            <IssueFlow
              open={issueOpen}
              onOpenChange={setIssueOpen}
              reservation={{
                id: activeReservation.reservationId,
                customerName: activeReservation.customerName,
                itemName: `${activeReservation.itemCount} Items`
              }}
              onConfirm={executeIssue}
            />

            <ReturnFlow
              open={returnOpen}
              onOpenChange={setReturnOpen}
              reservation={{
                id: activeReservation.reservationId,
                customerName: activeReservation.customerName,
                itemName: `${activeReservation.itemCount} Items`
              }}
              onConfirm={executeReturn}
            />
          </>
        )}

        <CustomerDetailSheet
          customerId={selectedCrmId}
          open={crmSheetOpen}
          onOpenChange={setCrmSheetOpen}
          onUpdate={() => refresh()}
        />

      </TooltipProvider>
    </ProviderLayout>
  );
};

export default DashboardOverview;
