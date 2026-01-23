import React, { useState, useMemo } from 'react';
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { AgendaRow } from "@/components/dashboard/AgendaRow";
import { AgendaItemProps } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Filter, Plus, RefreshCw, ArrowRight, Clock, ShieldCheck, Package } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { enUS } from "date-fns/locale";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutDashboard, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock KPI data
const mockKpiData = {
    activeRentals: 18,
    activeTrend: "+4 this week",
    activeTrendDir: "up" as const,
    returnsToday: 6,
    returnsTrend: "2 overdue",
    returnsTrendDir: "down" as const,
    dailyRevenue: 1245,
    revenueTrend: "+18%",
    revenueTrendDir: "up" as const,
};

const today = new Date();

// Mock agenda items
const mockAgendaItems: AgendaItemProps[] = [
    { reservationId: "demo-1", customerName: "Alex Thompson", itemCount: 3, status: "ready", type: "pickup", time: "09:30", paymentStatus: "paid", startDate: format(today, "yyyy-MM-dd"), endDate: format(addDays(today, 4), "yyyy-MM-dd") },
    { reservationId: "demo-2", customerName: "Sarah Mitchell", itemCount: 2, status: "active", type: "return", time: "11:00", paymentStatus: "paid", startDate: format(subDays(today, 3), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") },
    { reservationId: "demo-3", customerName: "James Wilson", itemCount: 1, status: "ready", type: "pickup", time: "14:00", paymentStatus: "deposit_paid", startDate: format(today, "yyyy-MM-dd"), endDate: format(addDays(today, 2), "yyyy-MM-dd") },
    { reservationId: "demo-4", customerName: "Emma Davis", itemCount: 4, status: "active", type: "return", time: "16:30", paymentStatus: "paid", startDate: format(subDays(today, 5), "yyyy-MM-dd"), endDate: format(today, "yyyy-MM-dd") },
];

// Mock exceptions
interface DemoException { id: string; message: string; customer: string; priority: 'high' | 'medium'; }
const mockExceptions: DemoException[] = [
    { id: "exc-1", message: "Touring Skis 170cm — 2 days overdue", priority: "high", customer: "Mike Johnson" },
    { id: "exc-2", message: "Backpack 45L — returned with damage", priority: "medium", customer: "Lisa Brown" },
];

// Mock inventory
const mockInventory = [
    { id: 1, name: "Touring Skis 170cm", category: "Skis", status: "available", assets: 8, price: "$45/day" },
    { id: 2, name: "Touring Skis 180cm", category: "Skis", status: "available", assets: 5, price: "$45/day" },
    { id: 3, name: "Hiking Backpack 45L", category: "Bags", status: "low_stock", assets: 2, price: "$12/day" },
    { id: 4, name: "4-Person Tent", category: "Camping", status: "available", assets: 6, price: "$35/day" },
    { id: 5, name: "Trekking Poles (pair)", category: "Accessories", status: "available", assets: 12, price: "$8/day" },
    { id: 6, name: "Sleeping Bag -10°C", category: "Camping", status: "maintenance", assets: 1, price: "$15/day" },
];

const DemoDashboard = () => {
    const [demoPage, setDemoPage] = useState<'dashboard' | 'inventory'>('dashboard');
    const [viewMode, setViewMode] = useState<'overview' | 'operations'>('overview');
    const [agendaItems, setAgendaItems] = useState(mockAgendaItems);
    const [exceptions, setExceptions] = useState(mockExceptions);
    const [agendaTab, setAgendaTab] = useState<'all' | 'pickups' | 'returns'>('all');

    const handleIssue = (item: AgendaItemProps) => {
        toast.success(`✅ Equipment issued to ${item.customerName}`, { description: `${item.itemCount} item(s)` });
        setAgendaItems(prev => prev.filter(i => i.reservationId !== item.reservationId));
    };

    const handleReturn = (item: AgendaItemProps) => {
        toast.success(`📦 Return processed for ${item.customerName}`, { description: `${item.itemCount} item(s) checked in` });
        setAgendaItems(prev => prev.filter(i => i.reservationId !== item.reservationId));
    };

    const handleExceptionResolve = (excId: string) => {
        toast.success("✓ Exception resolved");
        setExceptions(prev => prev.filter(e => e.id !== excId));
    };

    const resetDemo = () => {
        setAgendaItems(mockAgendaItems);
        setExceptions(mockExceptions);
        setAgendaTab('all');
        toast.info("Demo data reset");
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const filteredAgendaItems = useMemo(() => {
        if (agendaTab === 'all') return agendaItems;
        if (agendaTab === 'pickups') return agendaItems.filter(i => i.type === 'pickup');
        return agendaItems.filter(i => i.type === 'return');
    }, [agendaItems, agendaTab]);

    const pickupsCount = agendaItems.filter(i => i.type === 'pickup').length;
    const returnsCount = agendaItems.filter(i => i.type === 'return').length;

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 bg-background min-h-screen">
            {/* Demo Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">Interactive Demo</p>
                        <p className="text-sm text-muted-foreground">Click actions to see how Kitloop works</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={resetDemo} className="gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" /> Reset
                    </Button>
                    <Button variant="cta" size="sm" asChild className="gap-1.5">
                        <Link to="/signup">Start Free <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </Button>
                </div>
            </div>

            {/* Page Switcher */}
            <div className="flex gap-3">
                <button onClick={() => setDemoPage('dashboard')} className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${demoPage === 'dashboard' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${demoPage === 'dashboard' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                            <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div><p className="font-semibold">Dashboard</p><p className="text-xs text-muted-foreground">Daily operations</p></div>
                    </div>
                </button>
                <button onClick={() => setDemoPage('inventory')} className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${demoPage === 'inventory' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${demoPage === 'inventory' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                            <Package className="w-5 h-5" />
                        </div>
                        <div><p className="font-semibold">Inventory</p><p className="text-xs text-muted-foreground">Gear & assets</p></div>
                    </div>
                </button>
            </div>

            {/* Dashboard View */}
            {demoPage === 'dashboard' && (
                <>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                <span>Mission Control</span><SyncIndicator />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-heading font-bold tracking-tight">{greeting()}, Demo User</h1>
                            <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                                <span className="font-medium">{format(today, "EEEE, MMMM d", { locale: enUS })}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="mr-2 border-r pr-2">
                                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'overview' | 'operations')}>
                                    <ToggleGroupItem value="overview"><LayoutDashboard className="h-4 w-4" /></ToggleGroupItem>
                                    <ToggleGroupItem value="operations"><ListTodo className="h-4 w-4" /></ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => toast.info("Filter panel")}><Filter className="w-4 h-4" /> Filter</Button>
                            <Button variant="primary" size="sm" onClick={() => toast.info("New reservation form")}><Plus className="w-4 h-4" /> New</Button>
                        </div>
                    </div>

                    {viewMode === 'overview' && <KpiStrip data={mockKpiData} />}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Exceptions */}
                        <div className="lg:col-span-4 xl:col-span-3">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center justify-between">
                                        <span>Needs Attention</span>
                                        <Badge variant="destructive" className="px-1.5 h-5">{exceptions.length}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-2">
                                    {exceptions.map((ex) => (
                                        <div key={ex.id} className={`p-3 rounded-md border text-sm flex flex-col gap-2 ${ex.priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                                            <div className="flex items-start gap-3">
                                                <Clock className={`w-4 h-4 mt-0.5 ${ex.priority === 'high' ? 'text-red-600' : 'text-orange-600'}`} />
                                                <div className="flex-1">
                                                    <p className={`font-medium ${ex.priority === 'high' ? 'text-red-900' : 'text-orange-900'}`}>{ex.message}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Customer: {ex.customer}</p>
                                                </div>
                                            </div>
                                            <Button variant="warning" size="sm" className="w-full h-7 text-xs" onClick={() => handleExceptionResolve(ex.id)}>Resolve</Button>
                                        </div>
                                    ))}
                                    {exceptions.length === 0 && <EmptyState icon={ShieldCheck} title="All clear!" description="No issues" className="py-6 border-none bg-transparent" />}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Agenda */}
                        <div className="lg:col-span-8 xl:col-span-9 bento-card p-6 min-h-[400px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {viewMode === 'operations' ? "Work Queue" : "Today's Agenda"}
                                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{filteredAgendaItems.length}</span>
                                </h3>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className={`h-7 text-xs ${agendaTab === 'all' ? 'font-semibold text-primary bg-primary/5' : 'text-muted-foreground'}`} onClick={() => setAgendaTab('all')}>All ({agendaItems.length})</Button>
                                    <Button variant="ghost" size="sm" className={`h-7 text-xs ${agendaTab === 'pickups' ? 'font-semibold text-primary bg-primary/5' : 'text-muted-foreground'}`} onClick={() => setAgendaTab('pickups')}>Pickups ({pickupsCount})</Button>
                                    <Button variant="ghost" size="sm" className={`h-7 text-xs ${agendaTab === 'returns' ? 'font-semibold text-primary bg-primary/5' : 'text-muted-foreground'}`} onClick={() => setAgendaTab('returns')}>Returns ({returnsCount})</Button>
                                </div>
                            </div>
                            {filteredAgendaItems.length > 0 ? (
                                <div className="space-y-3">{filteredAgendaItems.map((item) => <AgendaRow key={item.reservationId} data={item} onIssue={() => handleIssue(item)} onReturn={() => handleReturn(item)} />)}</div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4"><ListTodo className="w-8 h-8" /></div>
                                    <h4 className="font-semibold text-lg mb-2">All caught up! 🎉</h4>
                                    <Button variant="secondary" onClick={resetDemo}>Reset Demo</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Inventory View */}
            {demoPage === 'inventory' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-heading font-bold tracking-tight">Inventory</h1>
                            <p className="text-muted-foreground">Manage your rental gear and assets</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => toast.info("Import CSV")}>Import</Button>
                            <Button variant="primary" onClick={() => toast.info("Add product form")}><Plus className="w-4 h-4" /> Add Product</Button>
                        </div>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Assets</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockInventory.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'available' ? 'default' : item.status === 'low_stock' ? 'destructive' : 'secondary'} className={item.status === 'available' ? 'bg-emerald-100 text-emerald-800' : ''}>
                                                {item.status === 'available' ? 'Available' : item.status === 'low_stock' ? 'Low Stock' : 'Maintenance'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">{item.assets}</TableCell>
                                        <TableCell>{item.price}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toast.info(`Edit ${item.name}`)}>Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* CTA Footer */}
            <div className="text-center py-8 border-t mt-8">
                <p className="text-muted-foreground mb-4">Ready to streamline your rental operations?</p>
                <div className="flex justify-center gap-3">
                    <Button variant="secondary" asChild><Link to="/about">Learn More</Link></Button>
                    <Button variant="cta" asChild><Link to="/signup">Start Free Trial <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
                </div>
            </div>
        </div>
    );
};

export default DemoDashboard;
