import React, { useState } from 'react';
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { ExceptionsQueue } from "@/components/dashboard/ExceptionsQueue";
import { AgendaRow } from "@/components/dashboard/AgendaRow";
import { AgendaItemProps } from "@/types/dashboard";
import { IssueFlow } from "@/components/operations/IssueFlow";
import { ReturnFlow } from "@/components/operations/ReturnFlow";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, Plus, RefreshCw } from "lucide-react";
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

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { canViewFinancials } = usePermissions();

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
    await issueReservation({ id, isOverride });
  };

  const executeReturn = async (id: string, damage: boolean) => {
    await returnReservation({ id, damage });
  };

  if (isLoading && !kpiData.activeRentals) {
    return (
      <ProviderLayout>
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Mission Control...</div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <TooltipProvider>
        <div className="space-y-6">

          {/* 1. Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <span>Mission Control</span>
                <SyncIndicator />
              </div>
              <h1 className="text-3xl lg:text-4xl font-heading font-bold tracking-tight text-foreground flex items-center gap-2">
                {new Date().getHours() < 12 ? 'Good morning,' : new Date().getHours() < 18 ? 'Good afternoon,' : 'Good evening,'} Admin
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="text-foreground/80 font-medium">
                  {format(new Date(), "EEEE, d. MMMM", { locale: cs })}
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
                        <LayoutDashboard className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>Overview Mode</TooltipContent>
                    </Tooltip>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="operations" aria-label="Operations Mode">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ListTodo className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>Operations Mode</TooltipContent>
                    </Tooltip>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* REFRESH */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh Data</TooltipContent>
              </Tooltip>

              {/* FILTER */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filter View
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter dashboard items</TooltipContent>
              </Tooltip>

              {/* NEW RESERVATION */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild>
                    <Link to="/provider/reservations/new">
                      <Plus className="w-4 h-4 mr-2" />
                      New Reservation
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create a new booking (C)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 2. KPI Strip (Hidden in Operations Mode or Restricted) */}
          {viewMode === 'overview' && canViewFinancials && (
            <KpiStrip data={kpiData} />
          )}

          {/* 3. Main Operational Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Main Column: Agenda (Taking 8 cols) */}
            <div className="lg:col-span-8 xl:col-span-9 bento-card p-6 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-xl flex items-center gap-2">
                    {viewMode === 'operations' ? "Work Queue" : "Daily Agenda"}
                  </h3>
                  <p className="text-sm text-muted-foreground">Pickups and returns scheduled for today</p>
                </div>

                {/* Visual Tab Switcher (Simple) */}
                <div className="flex bg-muted p-1 rounded-lg">
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold shadow-sm bg-background text-foreground">
                    All <span className="ml-1 opacity-50">({agendaItems.length})</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    Pickups
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    Returns
                  </Button>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {agendaItems.map((item, idx) => (
                  <AgendaRow
                    key={idx}
                    data={item}
                    onIssue={handleIssueClick}
                    onReturn={handleReturnClick}
                    onCustomerClick={handleCustomerClick}
                  />
                ))}

                {agendaItems.length === 0 && (
                  <EmptyState
                    icon={CheckCircle2}
                    title="All caught up!"
                    description="No actions required currently."
                    action={{
                      label: "Create Reservation",
                      onClick: () => navigate('/provider/reservations/new')
                    }}
                    className="h-full items-center justify-center border-2 border-dashed border-muted bg-muted/10 rounded-xl"
                  />
                )}
              </div>
            </div>

            {/* Right Column: Exceptions & Notes (Taking 4 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-6">
              <ExceptionsQueue exceptions={exceptions} />

              <div className="bento-card p-4 space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Quick Stats
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-xs text-muted-foreground uppercase font-bold">Revenue</div>
                    <div className="text-lg font-bold text-blue-700">{(kpiData.dailyRevenue / 100).toFixed(0)}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="text-xs text-muted-foreground uppercase font-bold">Active</div>
                    <div className="text-lg font-bold text-purple-700">{kpiData.activeRentals}</div>
                  </div>
                </div>
              </div>

              {viewMode === 'overview' && (
                <div className="p-4 rounded-lg border bg-amber-50/50 border-amber-200/50 border-dashed text-center text-sm text-amber-900/60">
                  Write daily notes here...
                </div>
              )}
            </div>

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

        </div>
      </TooltipProvider>
    </ProviderLayout>
  );
};

export default DashboardOverview;
