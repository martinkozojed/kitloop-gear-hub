import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, RotateCcw, Euro } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCountUp } from "@/hooks/useCountUp";

interface KpiMetric {
    label: string;
    rawValue: number;
    formattedValue: string;
    trend: string;
    trendDir: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
    isCurrency: boolean;
}

import { KpiData } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

function AnimatedNumber({ value, isCurrency }: { value: number; isCurrency: boolean }) {
    const animated = useCountUp(value, 500);
    const formatter = isCurrency
        ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 })
        : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
    return <>{formatter.format(animated)}</>;
}

export function KpiStrip({ data }: { data?: KpiData }) {
    const { t } = useTranslation();
    const numberFormatter = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
    const currencyFormatter = new Intl.NumberFormat("cs-CZ", {
        style: "currency",
        currency: "CZK",
        maximumFractionDigits: 0
    });

    const formatCount = (value?: number) => numberFormatter.format(value ?? 0);
    const formatCurrency = (value?: number) => currencyFormatter.format(value ?? 0);

    const metrics: KpiMetric[] = [
        {
            label: t("dashboard.kpis.active"),
            rawValue: data?.activeRentals ?? 0,
            formattedValue: formatCount(data?.activeRentals),
            trend: data?.activeTrend || "stable",
            trendDir: data?.activeTrendDir || "neutral",
            icon: Activity,
            color: "text-status-success",
            isCurrency: false
        },
        {
            label: t("dashboard.kpis.returns"),
            rawValue: data?.returnsToday ?? 0,
            formattedValue: formatCount(data?.returnsToday),
            trend: data?.returnsTrend || "pending",
            trendDir: data?.returnsTrendDir || "neutral",
            icon: RotateCcw,
            color: "text-status-success",
            isCurrency: false
        },
        {
            label: t("dashboard.kpis.revenue"),
            rawValue: data?.dailyRevenue ?? 0,
            formattedValue: formatCurrency(data?.dailyRevenue),
            trend: data?.revenueTrend || "stable",
            trendDir: data?.revenueTrendDir || "neutral",
            icon: Euro,
            color: "text-status-success",
            isCurrency: true
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            {metrics.map((metric, i) => (
                <Card
                    key={i}
                    padding="default"
                    className="flex flex-col justify-between group relative overflow-hidden h-[150px] transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated animate-enter"
                    style={{ animationDelay: `${i * 80}ms` }}
                >
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                            {metric.label}
                        </span>
                        <div className="p-2 rounded-lg bg-muted border border-border group-hover:bg-accent transition-all duration-200">
                            <Icon icon={metric.icon} size="md" className={metric.color} />
                        </div>
                    </div>

                    <div className="mt-auto flex items-baseline gap-3">
                        <h2 className="text-4xl font-heading font-bold tracking-tighter text-foreground tabular-nums">
                            <AnimatedNumber value={metric.rawValue} isCurrency={metric.isCurrency} />
                        </h2>
                        <div className={`flex items-center text-xs font-semibold ${metric.trendDir === 'up' ? 'text-status-success' :
                            metric.trendDir === 'down' ? 'text-status-danger' : 'text-muted-foreground'
                            }`}>
                            {metric.trendDir === 'up' && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                            {metric.trendDir === 'down' && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                            {metric.trend}
                        </div>
                    </div>
                </Card>
            ))
            }
        </div >
    );
}
