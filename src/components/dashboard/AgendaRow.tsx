import React from 'react';
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2, AlertTriangle, Package, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { DENSITY } from "@/components/ui/density";
import { cn } from "@/lib/utils";
// import { motion } from "framer-motion"; // Removed to fix build error
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
        <div
            className={cn(
                "group relative flex items-center gap-4 p-3 pr-4 rounded-token-lg border bg-card shadow-xs hover:shadow-card hover:border-primary/20 transition-all",
                isBlocker ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"
            )}
            style={{ minHeight: DENSITY.desktop.rowHeight }}
        >
            {/* 1. Time Column - Prominent */}
            <div className="flex flex-col items-center justify-center min-w-[60px] text-center border-r pr-4 mr-0">
                <span className="text-xl font-bold font-mono tracking-tight text-foreground group-hover:text-primary transition-colors">{data.time}</span>
                <span className={cn(
                    "text-xs uppercase font-bold tracking-wide mt-0.5",
                    isPickup ? "text-status-success" : "text-status-success"
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
                            <Icon icon={ShieldCheck} className="text-status-warning" />
                        )}
                        {data.customerRiskStatus === 'blacklist' && (
                            <Icon icon={ShieldCheck} className="text-status-danger" />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Icon icon={Package} className="opacity-70" /> {t('dashboard.agenda.items', { count: data.itemCount })}</span>
                    {renderStatusBadge()}
                </div>
            </div>

            {/* 3. Actions - Right Aligned */}
            <div className="flex items-center gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
                {isPickup ? (
                    <Button
                        variant={isBlocker ? "warning" : "secondary"}
                        className="font-semibold transition-all h-9 px-4"
                        size="sm"
                        onClick={() => onIssue?.(data)}
                    >
                        {isBlocker ? (
                            <span className="flex items-center gap-2">{t('dashboard.agenda.issue')} <Icon icon={AlertTriangle} /></span>
                        ) : (
                            <span className="flex items-center gap-2">{t('dashboard.agenda.issue')} <Icon icon={ArrowRight} /></span>
                        )}
                    </Button>
                ) : (
                    <Button
                        variant={data.status === 'completed' ? "ghost" : "success"}
                        className="font-semibold transition-all h-9 px-4"
                        size="sm"
                        onClick={() => data.status !== 'completed' && onReturn?.(data)}
                        disabled={data.status === 'completed'}
                    >
                        {data.status === 'completed' ? (
                            <span className="flex items-center gap-2"><Icon icon={Check} /> {t('dashboard.agenda.completed')}</span>
                        ) : (
                            t('dashboard.agenda.return')
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
