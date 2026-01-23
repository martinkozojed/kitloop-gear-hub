import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from "@/lib/supabase";
import { addDays, format, startOfDay, isSameDay, isWithinInterval, differenceInDays } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Filter, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ReservationDetailSheet } from "./ReservationDetailSheet";
import { useCalendarData, CalendarReservation as Reservation, CalendarVariant as ProductVariant } from "@/hooks/useCalendarData";
import { useTranslation } from "react-i18next";

interface CalendarProps {
    providerId: string;
}
// Removed local interfaces to use imported ones

const CELL_WIDTH = 48;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 250;

const ReservationCalendar: React.FC<CalendarProps> = ({ providerId }) => {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.language.startsWith('cs') ? cs : enUS;
    // View State
    const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
    const [dateRange, setDateRange] = useState({
        start: startOfDay(new Date()),
        days: 30
    });

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Handle View Mode Change
    useEffect(() => {
        setDateRange(prev => ({
            ...prev,
            days: viewMode === 'week' ? 7 : 30
        }));
    }, [viewMode]);

    const handleReservationClick = (res: Reservation) => {
        setSelectedReservation(res);
        setIsSheetOpen(true);
    };

    // --- Data Fetching (Optimized Hook) ---
    const { variants, reservations, isLoading, refetchReservations } = useCalendarData(providerId, {
        start: dateRange.start,
        days: dateRange.days
    });

    useEffect(() => {
        // Optional: Signal to refetch if we wanted granular control, 
        // but the hook handles keys automatically. We expose refetch if needed.
    }, []);

    // Handle status update locally + refetch
    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('reservations')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Stav rezervace změněn na: ${newStatus}`);

            // Refetch to ensure consistency
            refetchReservations();
            setIsSheetOpen(false);

        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Nepodařilo se změnit stav rezervace');
        }
    };


    // Calendar Grid Generation
    const days = useMemo(() => {
        return Array.from({ length: dateRange.days }).map((_, i) => {
            return addDays(dateRange.start, i);
        });
    }, [dateRange]);

    const handlePrev = () => setDateRange(prev => ({ ...prev, start: addDays(prev.start, viewMode === 'week' ? -7 : -30) }));
    const handleNext = () => setDateRange(prev => ({ ...prev, start: addDays(prev.start, viewMode === 'week' ? 7 : 30) }));
    const handleToday = () => setDateRange(prev => ({ ...prev, start: startOfDay(new Date()) }));


    // Render Helpers
    const getReservationStyle = (res: Reservation, rowStart: Date) => {
        const start = new Date(res.start_date);
        const end = new Date(res.end_date);

        const visibleStart = start < rowStart ? rowStart : start;
        const diffStart = differenceInDays(visibleStart, rowStart);
        let duration = differenceInDays(end, visibleStart);

        if (duration < 1) duration = 1;

        const maxDuration = dateRange.days - diffStart;
        const realDuration = Math.min(duration, maxDuration);

        return {
            left: `${diffStart * CELL_WIDTH}px`,
            width: `${realDuration * CELL_WIDTH}px`,
        };
    };

    const statusColors: Record<string, string> = {
        'confirmed': 'bg-sky-500 hover:bg-sky-600',
        'active': 'bg-emerald-500 hover:bg-emerald-600',
        'hold': 'bg-amber-400 hover:bg-amber-500 text-amber-950', // Warning color for holds
        'cancelled': 'bg-slate-300'
    };

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedCalendarStatus, setSelectedCalendarStatus] = useState<string>('all');

    // Filter Logic
    const filteredVariants = useMemo(() => {
        if (selectedCategory === 'all') return variants;
        return variants.filter(v => v.product.category === selectedCategory);
    }, [variants, selectedCategory]);

    const availableCategories = useMemo(() => {
        const cats = new Set(variants.map(v => v.product.category));
        return Array.from(cats);
    }, [variants]);

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
            {/* Controls */}
            <div className="flex flex-col gap-4 p-4 border-b bg-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" onClick={handleToday} className="px-4">{t('provider.reservations.calendar.today')}</Button>
                        <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                        <span className="font-semibold ml-4 min-w-[200px] text-lg">
                            {format(dateRange.start, 'd. MMMM', { locale: currentLocale })} - {format(addDays(dateRange.start, dateRange.days - 1), 'd. MMMM yyyy', { locale: currentLocale })}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        <div className="flex bg-muted rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('week')}
                                className={`px-3 py-1 text-sm rounded-md transition-all ${viewMode === 'week' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {t('provider.reservations.calendar.week')}
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-3 py-1 text-sm rounded-md transition-all ${viewMode === 'month' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {t('provider.reservations.calendar.month')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder={t('provider.reservations.calendar.categories')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('provider.reservations.calendar.categoriesAll')}</SelectItem>
                                {availableCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedCalendarStatus} onValueChange={setSelectedCalendarStatus}>
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue placeholder={t('provider.reservations.filters.status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('provider.reservations.calendar.statusAll')}</SelectItem>
                                <SelectItem value="confirmed">{t('provider.dashboard.status.confirmed')}</SelectItem>
                                <SelectItem value="active">{t('provider.dashboard.status.active')}</SelectItem>
                                <SelectItem value="hold">{t('provider.dashboard.status.hold')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 text-xs text-muted-foreground border-l pl-4 ml-auto">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-sky-500 rounded-sm"></div> {t('provider.dashboard.status.confirmed')}</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-sm"></div> {t('provider.dashboard.status.active')}</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-400 rounded-sm"></div> {t('provider.dashboard.status.hold')}</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-sm"></div> {t('provider.reservations.calendar.unassigned')}</div>
                    </div>
                </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-auto relative bg-slate-50/50">
                <div className="min-w-max">
                    {/* Header Row */}
                    <div className="flex sticky top-0 z-20 bg-background border-b shadow-sm">
                        <div className="sticky left-0 z-30 bg-background border-r p-3 flex items-center font-bold text-sm text-muted-foreground uppercase tracking-wider" style={{ width: SIDEBAR_WIDTH }}>
                            {t('provider.reservations.calendar.header')}
                        </div>
                        <div className="flex">
                            {days.map((day, i) => (
                                <div
                                    key={i}
                                    className={`border-r p-2 flex flex-col items-center justify-center text-sm ${isSameDay(day, new Date()) ? 'bg-blue-50/80 border-blue-100' : 'bg-background'}`}
                                    style={{ width: CELL_WIDTH, height: HEADER_HEIGHT }}
                                >
                                    <span className="text-muted-foreground text-xs uppercase">{format(day, 'EEE', { locale: currentLocale })}</span>
                                    <span className={`font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>{format(day, 'd')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body Rows */}
                    <div className="divide-y divide-slate-100">
                        {filteredVariants.map(variant => {
                            let variantReservations = reservations.filter(r => r.product_variant_id === variant.id);

                            // Apply status filter
                            if (selectedCalendarStatus !== 'all') {
                                variantReservations = variantReservations.filter(r => r.status === selectedCalendarStatus);
                            }

                            // Split: Assigned vs Unassigned
                            const assetRows = variant.assets.map(asset => {
                                const assetRes = variantReservations.filter(r =>
                                    r.assignments.some(a => a.asset_id === asset.id)
                                );
                                return { asset, reservations: assetRes };
                            });

                            const unassignedReservations = variantReservations.filter(r => r.assignments.length === 0);
                            // Calculate load for the variant header
                            const dailyLoad = days.map(day => {
                                const activeCount = variantReservations.filter(r =>
                                    isWithinInterval(day, { start: new Date(r.start_date), end: new Date(r.end_date) })
                                ).length;
                                const totalAssets = variant.assets.length;
                                const percentage = totalAssets > 0 ? (activeCount / totalAssets) * 100 : 0;
                                return { activeCount, totalAssets, percentage };
                            });

                            return (
                                <div key={variant.id} className="group bg-white">
                                    {/* Variant Header / Summary Row */}
                                    <div className="flex bg-slate-100/50 hover:bg-slate-100 transition-colors">
                                        <div className="sticky left-0 z-10 bg-slate-50 group-hover:bg-slate-100 border-r p-2 px-3 font-medium flex flex-col justify-center shadow-sm" style={{ width: SIDEBAR_WIDTH }}>
                                            <div className="truncate text-sm font-semibold text-slate-800">{variant.product.name}</div>
                                            <div className="flex justify-between items-center">
                                                <div className="truncate text-xs text-slate-500">{variant.name}</div>
                                                <Badge variant="secondary" className="text-xs h-4 px-1">{variant.assets.length}ks</Badge>
                                            </div>
                                        </div>
                                        <div className="flex relative items-center border-b border-l-0" style={{ height: 40 }}>
                                            {/* Grid lines */}
                                            {days.map((d, i) => {
                                                const load = dailyLoad[i];
                                                let loadColor = 'bg-emerald-400';
                                                if (load.percentage >= 90) loadColor = 'bg-red-500';
                                                else if (load.percentage >= 50) loadColor = 'bg-amber-400';

                                                // Don't show anything if 0 usage
                                                const showIndicator = load.activeCount > 0;

                                                return (
                                                    <div key={i} className={`border-r h-full absolute top-0 bottom-0 flex items-center justify-center ${isSameDay(d, new Date()) ? 'bg-blue-50/30' : ''}`} style={{ width: CELL_WIDTH, left: i * CELL_WIDTH }}>
                                                        {/* Capacity / Load Indicator */}
                                                        {showIndicator && (
                                                            <div
                                                                className={`h-1.5 rounded-full ${loadColor} transition-all`}
                                                                style={{ width: `${Math.max(20, load.percentage)}%`, opacity: 0.8 }}
                                                                title={t('provider.reservations.calendar.load', { percent: load.percentage.toFixed(0), active: load.activeCount, total: load.totalAssets })}
                                                            ></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Asset Rows */}
                                    {assetRows.map(({ asset, reservations: localRes }) => (
                                        <div key={asset.id} className="flex hover:bg-slate-50 transition-colors relative h-12 border-b border-slate-50">
                                            <div className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r p-2 pl-6 flex items-center text-sm shadow-sm" style={{ width: SIDEBAR_WIDTH }}>
                                                <span className="truncate text-slate-600 flex gap-2 items-center text-xs font-mono">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                                                    {asset.asset_tag}
                                                </span>
                                            </div>
                                            <div className="relative h-full w-full">
                                                {/* Grid Background */}
                                                {days.map((d, i) => (
                                                    <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 h-full ${isSameDay(d, new Date()) ? 'bg-blue-50/20' : ''}`} style={{ width: CELL_WIDTH, left: i * CELL_WIDTH }}></div>
                                                ))}

                                                {/* Reservation Bars */}
                                                {localRes.map(res => {
                                                    const style = getReservationStyle(res, dateRange.start);
                                                    if (parseFloat(style.width) <= 0) return null;

                                                    return (
                                                        <React.Fragment key={res.id}>
                                                            {/* Reservation Bar */}
                                                            <div
                                                                onClick={() => handleReservationClick(res)}
                                                                className={`absolute top-2 bottom-2 rounded-sm text-xs font-medium text-white px-2 flex items-center overflow-hidden whitespace-nowrap z-10 shadow-sm cursor-pointer hover:brightness-110 transition-all ${statusColors[res.status] || 'bg-blue-500'}`}
                                                                style={style}
                                                                title={`${res.customer_name} - ${res.status}`}
                                                            >
                                                                <span className="truncate">{res.customer_name}</span>
                                                                {!res.deposit_paid && <span className="ml-1 text-xs opacity-80" title="Nezaplaceno">⚠️</span>}
                                                            </div>

                                                            {/* Buffer Zone (1 Day Turnaround) */}
                                                            <div
                                                                className="absolute top-3 bottom-3 bg-slate-100/50 border border-slate-200 border-dashed rounded-r-sm z-0 pointer-events-none"
                                                                style={{
                                                                    left: `calc(${parseFloat(style.left as string) + parseFloat(style.width as string)}px)`,
                                                                    width: `${CELL_WIDTH}px` // Hardcoded 1 day buffer
                                                                }}
                                                                title="Technická pauza (Turnaround)"
                                                            />
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Unassigned Row (Critical for Planning) */}
                                    {unassignedReservations.length > 0 && (
                                        <div className="flex bg-red-50/30 hover:bg-red-50/50 transition-colors relative border-b border-red-100 h-14">
                                            <div className="sticky left-0 z-10 bg-white/80 border-r p-2 pl-6 flex items-center text-sm shadow-sm" style={{ width: SIDEBAR_WIDTH }}>
                                                <div className="flex flex-col">
                                                    <span className="truncate text-red-600 font-semibold text-xs flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Nepřiřazeno
                                                    </span>
                                                    <span className="text-xs text-red-400">{unassignedReservations.length} rezervací čeká na přiřazení</span>
                                                </div>
                                            </div>
                                            <div className="relative h-full w-full">
                                                {days.map((d, i) => (
                                                    <div key={i} className={`absolute top-0 bottom-0 border-r border-red-100/50 h-full ${isSameDay(d, new Date()) ? 'bg-blue-50/20' : ''}`} style={{ width: CELL_WIDTH, left: i * CELL_WIDTH }}></div>
                                                ))}

                                                {unassignedReservations.map((res, idx) => {
                                                    const style = getReservationStyle(res, dateRange.start);
                                                    return (
                                                        <div
                                                            key={res.id}
                                                            onClick={() => handleReservationClick(res)}
                                                            className={`absolute rounded-sm text-xs border border-red-200 bg-red-100 text-red-800 px-2 flex items-center overflow-hidden whitespace-nowrap hover:z-20 hover:scale-105 transition-all shadow-sm cursor-pointer`}
                                                            style={{ ...style, top: (idx * 16) + 4, height: 20, zIndex: 10 - idx }}
                                                            title={`Nepřiřazeno: ${res.customer_name}`}
                                                        >
                                                            <span className="truncate w-full">{res.customer_name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ReservationDetailSheet
                reservation={selectedReservation}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
};

export default ReservationCalendar;
