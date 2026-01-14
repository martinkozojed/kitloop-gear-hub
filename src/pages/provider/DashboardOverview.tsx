import React, { useState, useMemo } from 'react';
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { ExceptionsQueue } from "@/components/dashboard/ExceptionsQueue";
import { AgendaRow } from "@/components/dashboard/AgendaRow";
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
import { toast } from "sonner";
import { PageLoadingSkeleton } from "@/components/ui/loading-state";
import { useAuth } from "@/context/AuthContext";

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { canViewFinancials } = usePermissions();
  const { isAdmin, provider } = useAuth();

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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []); // Empty deps = calculate once on mount

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
    
    toast.success('Item issued successfully', {
      description: 'Reservation is now active'
    });
    setIssueOpen(false);
  };

  const executeReturn = async (id: string, damage: boolean) => {
    // Note: Hook already handles errors with optimistic rollback and error toast
    // We only add success feedback here
    await returnReservation({ id, damage });
    
    toast.success('Item returned successfully', {
      description: damage ? 'Damage report recorded' : 'All items in good condition'
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
        <div className="space-y-8">

          {/* 1. Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <span>Mission Control</span>
                <SyncIndicator />
              </div>
              <h1 className="text-3xl lg:text-4xl font-heading font-bold tracking-tight text-foreground flex items-center gap-2">
                {greeting} {!isAdmin && provider?.status !== 'approved' ? '' : isAdmin ? 'Admin' : provider?.rental_name || ''}
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

              {/* FILTER - TODO: Implement filtering functionality */}
              {/* Temporarily removed to avoid misleading UI */}

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
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-foreground">
                    {viewMode === 'operations' ? "Work Queue" : "Today's Work"}
                  </h3>
                  <p className="text-sm text-muted-foreground">All pickups and returns for today</p>
                </div>

                {/* Visual Tab Switcher (Functional) */}
                <div className="flex bg-muted p-1 rounded-lg">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 text-xs font-semibold ${agendaTab === 'all' ? 'shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('all')}
                  >
                    All <span className="ml-1 opacity-50">({agendaItems.length})</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 text-xs ${agendaTab === 'pickups' ? 'font-semibold shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('pickups')}
                  >
                    Pickups <span className="ml-1 opacity-50">({pickupsCount})</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 text-xs ${agendaTab === 'returns' ? 'font-semibold shadow-sm bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setAgendaTab('returns')}
                  >
                    Returns <span className="ml-1 opacity-50">({returnsCount})</span>
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
                    title="All caught up!"
                    description="No actions required currently."
                    action={{
                      label: "Create Reservation",
                      onClick: () => navigate('/provider/reservations/new')
                    }}
                    className="h-full items-center justify-center border-2 border-dashed border-muted bg-muted/10 rounded-xl"
                  />
                )}

                {filteredAgendaItems.length === 0 && agendaItems.length > 0 && (
                  <EmptyState
                    icon={CheckCircle2}
                    title={`No ${agendaTab} today`}
                    description={`Switch to "All" to see other items`}
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
  const { isAdmin, provider } = useAuth();
