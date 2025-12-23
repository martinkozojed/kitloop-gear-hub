import React from 'react';
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Activity, RotateCcw, Euro } from "lucide-react";

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
    const metrics: KpiMetric[] = [
        {
            label: "Active Rentals",
            value: data?.activeRentals.toString() || "0",
            trend: data?.activeTrend || "stable",
            trendDir: data?.activeTrendDir || "neutral",
            icon: Activity,
            color: "text-blue-500"
        },
        {
            label: "Returns Today",
            value: data?.returnsToday.toString() || "0",
            trend: data?.returnsTrend || "pending",
            trendDir: data?.returnsTrendDir || "neutral",
            icon: RotateCcw,
            color: "text-orange-500"
        },
        {
            label: "Daily Revenue",
            value: `${data?.dailyRevenue || 0} Kč`,
            trend: data?.revenueTrend || "stable",
            trendDir: data?.revenueTrendDir || "neutral",
            icon: Euro,
            color: "text-emerald-500"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
            {metrics.map((metric, i) => (
                <Card key={i} className="p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                            {metric.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {metric.value}
                            </h2>
                        </div>
                        <div className={`flex items-center text-xs ${metric.trendDir === 'up' ? 'text-emerald-600' :
                            metric.trendDir === 'down' ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                            {metric.trendDir === 'up' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {metric.trendDir === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {metric.trend}
                        </div>
                    </div>
                    <div className={`p-3 rounded-full bg-muted/50 ${metric.color}`}>
                        <metric.icon className="h-5 w-5" />
                    </div>
                </Card>
            ))}
        </div>
    );
}
