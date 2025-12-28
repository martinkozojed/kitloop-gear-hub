import React, { useState } from 'react';
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { ExceptionsQueue } from "@/components/dashboard/ExceptionsQueue";
import { AgendaRow } from "@/components/dashboard/AgendaRow";
import { AgendaItemProps, ExceptionItem } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutDashboard, ListTodo, CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

// Mock data for demo
const mockKpiData = {
    activeRentals: 12,
    activeTrend: "+2 this week",
    activeTrendDir: "up" as const,
    returnsToday: 5,
    returnsTrend: "3 pending",
    returnsTrendDir: "neutral" as const,
    dailyRevenue: 2840,
    revenueTrend: "+12%",
    revenueTrendDir: "up" as const,
};

const mockAgendaItems: AgendaItemProps[] = [
    {
        reservationId: "demo-1",
        customerName: "Jan Novák",
        itemCount: 2,
        status: "ready",
        type: "pickup",
        time: "09:00",
        paymentStatus: "paid",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    },
    {
        reservationId: "demo-2",
        customerName: "Petra Svobodová",
        itemCount: 1,
        status: "active",
        type: "return",
        time: "14:30",
        paymentStatus: "paid",
        startDate: format(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
    },
    {
        reservationId: "demo-3",
        customerName: "Martin Dvořák",
        itemCount: 3,
        status: "ready",
        type: "pickup",
        time: "11:00",
        paymentStatus: "paid",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    },
];

const mockExceptions: ExceptionItem[] = [
    {
        id: "exc-1",
        type: "overdue",
        message: "Turistický stan 4os. - Karel Procházka",
        priority: "high",
        customer: "Karel Procházka",
    },
];

const DemoDashboard = () => {
    const [viewMode, setViewMode] = useState<'overview' | 'operations'>('overview');

    const handleViewChange = (val: string) => {
        if (val) {
            setViewMode(val as 'overview' | 'operations');
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 bg-background min-h-screen">

            {/* Watermark */}
            <div className="fixed top-2 right-2 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-semibold z-50 backdrop-blur-sm border border-primary/20">
                Interactive Demo
            </div>

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Mission Control</span>
                        <SyncIndicator />
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-heading font-bold tracking-tight text-foreground">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Demo User
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

                    <Button variant="ghost" size="icon" disabled title="Demo Mode">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" disabled>
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                    <Button size="sm" className="gap-2" disabled>
                        <Plus className="w-4 h-4" />
                        New
                    </Button>
                </div>
            </div>

            {/* KPI Strip */}
            {viewMode === 'overview' && (
                <KpiStrip data={mockKpiData} />
            )}

            {/* Main Operational Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left: Exceptions */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                    <ExceptionsQueue exceptions={mockExceptions} />
                    {viewMode === 'overview' && (
                        <div className="p-4 rounded-lg border bg-muted/20 border-dashed text-center text-sm text-muted-foreground">
                            Staff Notes (Demo)
                        </div>
                    )}
                </div>

                {/* Right: Agenda */}
                <div className="lg:col-span-8 xl:col-span-9 bento-card p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            {viewMode === 'operations' ? "Work Queue" : "Today's Agenda"}
                            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{mockAgendaItems.length}</span>
                        </h3>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary bg-primary/5">All</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Pickups</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Returns</Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {mockAgendaItems.map((item, idx) => (
                            <AgendaRow
                                key={idx}
                                data={item}
                                onIssue={() => { }}
                                onReturn={() => { }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoDashboard;
