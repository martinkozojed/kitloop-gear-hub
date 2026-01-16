import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, RotateCcw, Euro } from "lucide-react";
import { useTranslation } from "react-i18next";

interface KpiMetric {
    label: string;
    value: string;
    trend: string;
    trendDir: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
}

import { KpiData } from "@/types/dashboard";

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
            value: formatCount(data?.activeRentals),
            trend: data?.activeTrend || "stable",
            trendDir: data?.activeTrendDir || "neutral",
            icon: Activity,
            color: "text-emerald-600"
        },
        {
            label: t("dashboard.kpis.returns"),
            value: formatCount(data?.returnsToday),
            trend: data?.returnsTrend || "pending",
            trendDir: data?.returnsTrendDir || "neutral",
            icon: RotateCcw,
            color: "text-emerald-500"
        },
        {
            label: t("dashboard.kpis.revenue"),
            value: formatCurrency(data?.dailyRevenue),
            trend: data?.revenueTrend || "stable",
            trendDir: data?.revenueTrendDir || "neutral",
            icon: Euro,
            color: "text-emerald-700"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            {metrics.map((metric, i) => (
                <div 
                    key={i} 
                    className="bento-card p-6 flex flex-col justify-between group relative overflow-hidden h-[150px] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            {metric.label}
                        </span>
                        <div className={`p-2 rounded-lg bg-zinc-50 border border-zinc-100 group-hover:bg-white transition-all duration-200`}>
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                    </div>

                    <div className="mt-auto flex items-baseline gap-3">
                        <h2 className="text-4xl font-semibold tracking-tighter text-foreground">
                            {metric.value}
                        </h2>
                        <div className={`flex items-center text-xs font-semibold ${metric.trendDir === 'up' ? 'text-emerald-600' :
                            metric.trendDir === 'down' ? 'text-red-600' : 'text-zinc-400'
                            }`}>
                            {metric.trendDir === 'up' && <ArrowUpRight className="h-3 w-3 mr-0.5" />}
                            {metric.trendDir === 'down' && <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                            {metric.trend}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
