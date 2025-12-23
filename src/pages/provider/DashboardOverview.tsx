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
import { SyncIndicator } from "@/components/ui/sync-indicator";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutDashboard, ListTodo, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";

const DashboardOverview = () => {
  const navigate = useNavigate();
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

  const executeIssue = async (id: string, isOverride: boolean) => {
    await issueReservation({ id, isOverride });
  };

  const executeReturn = async (id: string, damage: boolean) => {
    await returnReservation({ id, damage });
  };

  if (isLoading && !kpiData.activeRentals) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Mission Control...</div>
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">

      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Mission Control
            <SyncIndicator />
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: cs })}
          </p>
        </div>
        <div className="flex items-center gap-2">

          {/* VIEW TOGGLE */}
          <div className="mr-2 border-r pr-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange}>
              <ToggleGroupItem value="overview" aria-label="Overview Mode">
                <LayoutDashboard className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="operations" aria-label="Operations Mode">
                <ListTodo className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Refresh is now automatic via React Query invalidation, but manual refresh can just invalidateQueries */}
          <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={isLoading} title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter View
          </Button>
          <Button asChild>
            <Link to="/provider/reservations/new">
              <Plus className="w-4 h-4 mr-2" />
              New Reservation
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. KPI Strip (Hidden in Operations Mode) */}
      {viewMode === 'overview' && (
        <KpiStrip data={kpiData} />
      )}

      {/* 3. Main Operational Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Exceptions Queue */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <ExceptionsQueue exceptions={exceptions} />
          {viewMode === 'overview' && (
            <div className="p-4 rounded-lg border bg-muted/20 border-dashed text-center text-sm text-muted-foreground">
              Staff Notes (Coming Soon)
            </div>
          )}
        </div>

        {/* Right Column: Today's Agenda */}
        {/* In Operations Mode, we could expand this to use full width if we wanted, but for now keeping grid is stable. 
            However, we might want to emphasize it more. */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {viewMode === 'operations' ? "Work Queue (Operations)" : "Today's Agenda"}
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{agendaItems.length}</span>
            </h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary bg-primary/5">All</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Pickups</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Returns</Button>
            </div>
          </div>

          <div className="space-y-3">
            {agendaItems.map((item, idx) => (
              <AgendaRow
                key={idx}
                data={item}
                onIssue={handleIssueClick}
                onReturn={handleReturnClick}
              />
            ))}
          </div>

          {agendaItems.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="No pickups or returns scheduled for today. Good time to manage inventory?"
              action={{
                label: "Create Reservation",
                onClick: () => navigate('/provider/reservations/new')
              }}
            />
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
              itemName: `${activeReservation.itemCount} Items`,
              status: 'confirmed', // Issue flow always starts from confirmed state in this context
              paymentStatus: (activeReservation.paymentStatus || 'paid') as 'paid' | 'unpaid',
              startDate: activeReservation.startDate || '',
              endDate: activeReservation.endDate || ''
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

    </div>
  );
};

export default DashboardOverview;
