import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, AlertTriangle, Package, ShieldCheck } from "lucide-react";
import { DENSITY } from "@/components/ui/density";
import { cn } from "@/lib/utils";

/**
 * Agenda Row - The Atomic Unit of the Operational Dashboard
 * Designed for < 30s interaction times.
 */

import { AgendaItemProps } from "@/types/dashboard";

/* Removed local interface definition */

interface AgendaRowActions {
    onIssue?: (item: AgendaItemProps) => void;
    onReturn?: (item: AgendaItemProps) => void;
    onCustomerClick?: (crmId: string) => void;
}

export function AgendaRow({ data, onIssue, onReturn, onCustomerClick }: { data: AgendaItemProps } & AgendaRowActions) {
    // Determine actionable state
    const isPickup = data.type === 'pickup';
    const isBlocker = data.status === 'unpaid' || data.status === 'conflict';

    // Status Pill Styles
    const getStatusBadge = () => {
        switch (data.status) {
            case 'ready':
                return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>;
            case 'unpaid':
                return <span className="bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Unpaid</span>;
            case 'conflict':
                return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">Conflict</span>;
            default: return null;
        }
    };

    return (
        <div
            className={cn(
                "flex items-center gap-4 p-3 pr-4 rounded-lg border bg-card transition-all hover:bg-muted/30 hover:border-primary/20",
                isBlocker ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"
            )}
            style={{ minHeight: DENSITY.desktop.rowHeight }}
        >
            {/* Time & Type */}
            <div className="flex flex-col items-center justify-center min-w-[60px] text-center">
                <span className="text-sm font-bold font-mono text-foreground">{data.time}</span>
                <Badge variant="outline" className={cn(
                    "mt-1 text-[10px] uppercase h-5 border-0 font-bold",
                    isPickup ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                )}>
                    {isPickup ? 'Výdej' : 'Příjem'}
                </Badge>
            </div>

            {/* Customer & Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onCustomerClick && data.crmCustomerId && onCustomerClick(data.crmCustomerId)}
                        className={cn(
                            "font-semibold text-sm truncate text-left flex items-center gap-1.5",
                            data.crmCustomerId ? "text-primary cursor-pointer hover:underline" : "text-foreground"
                        )}
                        disabled={!data.crmCustomerId}
                    >
                        {data.customerName}
                        {data.customerRiskStatus === 'blacklist' && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-0.5 animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> STOP
                            </Badge>
                        )}
                        {data.customerRiskStatus === 'warning' && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-amber-700 bg-amber-50 border-amber-200 gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> RISK
                            </Badge>
                        )}
                        {data.customerRiskStatus === 'trusted' && (
                            <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 gap-0.5 border-transparent">
                                <ShieldCheck className="w-3 h-3" /> VIP
                            </Badge>
                        )}
                        {data.customerRiskStatus === 'verified' && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] text-blue-700 bg-blue-50 border-blue-200 gap-0.5">
                                <ShieldCheck className="w-3 h-3" /> ID OK
                            </Badge>
                        )}
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                        <Phone className="w-3 h-3" />
                    </Button>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> {data.itemCount} items
                    </span>
                    {getStatusBadge()}
                </div>
            </div>

            {/* Primary Action Zone (The 30-Second Trigger) */}
            <div className="flex items-center gap-2">
                {isPickup ? (
                    <Button
                        className={cn(
                            "shadow-sm transition-all font-semibold",
                            isBlocker ? "opacity-50 grayscale cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                        disabled={false}
                        size="sm"
                        onClick={() => onIssue?.(data)}
                    >
                        Vydat
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        className="font-semibold text-orange-800 bg-orange-100 hover:bg-orange-200"
                        size="sm"
                        onClick={() => onReturn?.(data)}
                    >
                        Přijmout
                    </Button>
                )}
            </div>
        </div>
    );
}
