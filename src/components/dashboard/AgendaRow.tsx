import React from 'react';
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, AlertTriangle, Package, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { DENSITY } from "@/components/ui/density";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AgendaItemProps } from "@/types/dashboard";
import { useTranslation } from "react-i18next";

/**
 * Agenda Row - The Atomic Unit of the Operational Dashboard
 * Designed for < 30s interaction times.
 */

interface AgendaRowActions {
    onIssue?: (item: AgendaItemProps) => void;
    onReturn?: (item: AgendaItemProps) => void;
    onCustomerClick?: (crmId: string) => void;
}

export function AgendaRow({ data, onIssue, onReturn, onCustomerClick }: { data: AgendaItemProps } & AgendaRowActions) {
    const { t } = useTranslation();
    // Determine actionable state
    const isPickup = data.type === 'pickup';
    const isBlocker = data.status === 'unpaid' || data.status === 'conflict';

    // Status Pill via StatusBadge component
    const renderStatusBadge = () => {
        if (data.status === 'ready' || data.status === 'unpaid' || data.status === 'conflict') {
            return <StatusBadge status={data.status} size="sm" />;
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.005, backgroundColor: "rgba(var(--card-rgb), 0.8)" }}
            transition={{ duration: 0.2 }}
            className={cn(
                "group relative flex items-center gap-4 p-3 pr-4 rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all",
                isBlocker ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"
            )}
            style={{ minHeight: DENSITY.desktop.rowHeight }}
        >
            {/* 1. Time Column - Prominent */}
            <div className="flex flex-col items-center justify-center min-w-[60px] text-center border-r pr-4 mr-0">
                <span className="text-xl font-bold font-mono tracking-tight text-foreground group-hover:text-primary transition-colors">{data.time}</span>
                <span className={cn(
                    "text-[9px] uppercase font-extrabold tracking-wider mt-0.5",
                    isPickup ? "text-emerald-600/80" : "text-emerald-700/80"
                )}>
                    {isPickup ? t('dashboard.agenda.pickupLabel') : t('dashboard.agenda.returnLabel')}
                </span>
            </div>

            {/* 2. Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                    <div
                        className={cn("font-semibold text-base truncate flex items-center gap-2", data.crmCustomerId ? "cursor-pointer hover:text-primary transition-colors" : "")}
                        onClick={() => data.crmCustomerId && onCustomerClick?.(data.crmCustomerId)}
                    >
                        {data.customerName}
                        {data.customerRiskStatus === 'warning' && (
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                        )}
                        {data.customerRiskStatus === 'blacklist' && (
                            <ShieldCheck className="w-4 h-4 text-red-500" />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 opacity-70" /> {t('dashboard.agenda.items', { count: data.itemCount })}</span>
                    {renderStatusBadge()}
                </div>
            </div>

            {/* 3. Actions - Right Aligned */}
            <div className="flex items-center gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
                {isPickup ? (
                    <Button
                        className={cn(
                            "shadow-sm transition-all font-semibold relative overflow-hidden group/btn px-4 h-9 backdrop-blur-sm",
                            isBlocker
                                ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-500/25 hover:shadow-lg hover:-translate-y-0.5"
                        )}
                        disabled={false} // Always enable to allow override flow
                        size="sm"
                        onClick={() => onIssue?.(data)}
                    >
                        {isBlocker ? (
                            <span className="flex items-center gap-2">{t('dashboard.agenda.issue')} <AlertTriangle className="w-3.5 h-3.5" /></span>
                        ) : (
                            <span className="flex items-center gap-2">{t('dashboard.agenda.issue')} <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" /></span>
                        )}
                    </Button>
                ) : (
                    <Button
                        className={cn(
                            "font-semibold transition-all h-9 px-4",
                            data.status === 'completed'
                                ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-500/25 hover:shadow-lg hover:-translate-y-0.5"
                        )}
                        variant={data.status === 'completed' ? "ghost" : "primary"}
                        size="sm"
                        onClick={() => data.status !== 'completed' && onReturn?.(data)}
                        disabled={data.status === 'completed'}
                    >
                        {data.status === 'completed' ? (
                            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> {t('dashboard.agenda.completed')}</span>
                        ) : (
                            t('dashboard.agenda.return')
                        )}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
