
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { CronJobsSection, CronHealth, CronFilter } from "@/components/analytics/sections/CronJobsSection";

interface RpcLog {
    id: string;
    rpc_name: string;
    duration_ms: number;
    success: boolean;
    error_details: string | null;
    created_at: string;
}

export default function Observability() {
    const cronSectionRef = useRef<HTMLDivElement>(null);
    const [cronFilter, setCronFilter] = useState<CronFilter>('all');

    // 1. Existing RPC Logs Query
    const { data: logs, isLoading } = useQuery({
        queryKey: ["rpc_logs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("rpc_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            return data as unknown as RpcLog[];
        },
    });

    // 2. New Cron Health Query
    const { data: cronHealth, isLoading: cronHealthLoading } = useQuery({
        queryKey: ["cron_health"],
        queryFn: async () => {
            // RPC might fail if RLS not set up for current user context (requires admin)
            // But we handle error gracefully in UI (empty list or error state)
            const { data, error } = await (supabase.rpc as any)("get_cron_health");
            if (error) throw error;
            return data as unknown as CronHealth[];
        }
    });

    // Compute stats for alert banner
    const cronStats = {
        stale: cronHealth?.filter((j: CronHealth) => j.stale).length ?? 0,
        failed: cronHealth?.filter((j: CronHealth) => j.last_status === 'failed').length ?? 0
    };

    const scrollToCronSection = (filter: CronFilter) => {
        setCronFilter(filter);
        cronSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">System Observability</h1>
            </div>

            {/* Alert Banner for Cron Issues */}
            {!cronHealthLoading && (cronStats.failed > 0 || cronStats.stale > 0) && (
                <div className="space-y-2" data-testid="cron-alert-banner">
                    {cronStats.failed > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="font-medium text-red-800">
                                    {cronStats.failed} cron job{cronStats.failed > 1 ? 's' : ''} failing
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-700 hover:bg-red-100"
                                onClick={() => scrollToCronSection('failing')}
                            >
                                View Failing <ArrowDown className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {cronStats.stale > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                <span className="font-medium text-amber-800">
                                    {cronStats.stale} cron job{cronStats.stale > 1 ? 's' : ''} stale
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                                onClick={() => scrollToCronSection('stale')}
                            >
                                View Stale <ArrowDown className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Cron Jobs Section (P2 Epic B) */}
            <div className="space-y-4" ref={cronSectionRef}>
                <h2 className="text-xl font-semibold">Cron Jobs Health</h2>
                <CronJobsSection
                    data={cronHealth || []}
                    isLoading={cronHealthLoading}
                    initialFilter={cronFilter}
                />
            </div>

            <div className="border-t pt-4"></div>

            {/* Existing RPC Metrics */}
            <h2 className="text-xl font-semibold">RPC Metrics & Logs</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests (Last 100)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs?.length
                                ? Math.round(logs.reduce((acc: number, log: RpcLog) => acc + (log.duration_ms || 0), 0) / logs.length)
                                : 0} ms
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {logs?.length
                                ? Math.round((logs.filter((l: RpcLog) => !l.success).length / logs.length) * 100)
                                : 0}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>RPC Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>RPC Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Error Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : logs?.map((log: RpcLog) => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                                    <TableCell className="font-mono">{log.rpc_name}</TableCell>
                                    <TableCell>
                                        {log.success ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <AlertCircle className="w-3 h-3 mr-1" /> Error
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{log.duration_ms} ms</TableCell>
                                    <TableCell className="text-red-500 text-sm max-w-xs truncate" title={log.error_details || ""}>
                                        {log.error_details}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
