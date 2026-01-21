
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, AlertCircle, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface CronHealth {
    jobname: string;
    schedule: string;
    command: string;
    last_run_at: string | null;
    last_status: string | null;
    last_rows_affected: number | null;
    last_error: string | null;
    active: boolean;
    stale: boolean;
    config_stale_limit: number;
}

interface CronRun {
    id: string;
    cron_name: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
}

export type CronFilter = 'all' | 'stale' | 'failing' | 'ok';

export interface CronStats {
    total: number;
    stale: number;
    failed: number;
    active: number;
}

interface CronJobsSectionProps {
    data: CronHealth[];
    isLoading: boolean;
    initialFilter?: CronFilter;
}

export function CronJobsSection({ data, isLoading, initialFilter = 'all' }: CronJobsSectionProps) {
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [filter, setFilter] = useState<CronFilter>(initialFilter);

    const stats: CronStats = {
        total: data.length,
        stale: data.filter(j => j.stale).length,
        failed: data.filter(j => j.last_status === 'failed').length,
        active: data.filter(j => j.active).length
    };

    // Sync filter with parent when changed (e.g., from banner CTA)
    useEffect(() => {
        setFilter(initialFilter);
    }, [initialFilter]);

    // Filter data based on selected filter
    const filteredData = data.filter(job => {
        switch (filter) {
            case 'stale': return job.stale;
            case 'failing': return job.last_status === 'failed';
            case 'ok': return !job.stale && job.last_status === 'success';
            default: return true;
        }
    });

    const { data: jobHistory, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['cron_history', selectedJob],
        queryFn: async () => {
            if (!selectedJob) return [];
            // We need to handle the mapping if cron_name differs, but for now assuming 1:1 or using jobname 
            // RPC handles mapping for health, but here we query raw logs. 
            // Ideally we should pass the mapped name, but let's query by cron_name which typically matches jobname.
            const { data, error } = await supabase
                .from('cron_runs')
                .select('*')
                .eq('cron_name', selectedJob) // Limitation: assuming jobname matches cron_name in logs
                .order('started_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data as CronRun[];
        },
        enabled: !!selectedJob
    });

    const renderStatus = (status: string | null, stale: boolean) => {
        if (stale) return <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Stale</Badge>;
        if (status === 'success') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>;
        if (status === 'failed') return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
        if (status === 'started') return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
        return <Badge variant="outline">Unknown</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Jobs</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{isLoading ? "-" : stats.total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stale Jobs</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.stale > 0 ? "text-amber-600" : ""}`}>
                            {isLoading ? "-" : stats.stale}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Failing Jobs</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.failed > 0 ? "text-red-600" : ""}`}>
                            {isLoading ? "-" : stats.failed}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Config</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{isLoading ? "-" : stats.active}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Cron Jobs Health</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant={filter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('all')}
                                data-testid="cron-filter-all"
                            >
                                All ({stats.total})
                            </Button>
                            <Button
                                variant={filter === 'stale' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('stale')}
                                className={stats.stale > 0 ? 'border-amber-400 text-amber-700' : ''}
                                data-testid="cron-filter-stale"
                            >
                                Stale ({stats.stale})
                            </Button>
                            <Button
                                variant={filter === 'failing' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('failing')}
                                className={stats.failed > 0 ? 'border-red-400 text-red-700' : ''}
                                data-testid="cron-filter-failing"
                            >
                                Failing ({stats.failed})
                            </Button>
                            <Button
                                variant={filter === 'ok' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('ok')}
                                data-testid="cron-filter-ok"
                            >
                                OK
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table data-testid="cron-jobs-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job Name</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Last Run</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Rows Affected</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-4">{filter === 'all' ? 'No cron jobs found.' : `No ${filter} jobs found.`}</TableCell></TableRow>
                            ) : (
                                filteredData.map(job => (
                                    <TableRow key={job.jobname}>
                                        <TableCell className="font-medium font-mono text-sm">{job.jobname}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{job.schedule}</TableCell>
                                        <TableCell>
                                            {job.last_run_at ? format(new Date(job.last_run_at), "MMM d, HH:mm") : "Never"}
                                        </TableCell>
                                        <TableCell>{renderStatus(job.last_status, job.stale)}</TableCell>
                                        <TableCell>{job.last_rows_affected ?? "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedJob(job.jobname)}>History</Button>
                                                </SheetTrigger>
                                                <SheetContent className="min-w-[500px]">
                                                    <SheetHeader>
                                                        <SheetTitle>History: {job.jobname}</SheetTitle>
                                                    </SheetHeader>
                                                    <div className="mt-6 space-y-4">
                                                        {isLoadingHistory ? (
                                                            <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                                                        ) : jobHistory?.length === 0 ? (
                                                            <p className="text-muted-foreground">No run history found.</p>
                                                        ) : (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Date</TableHead>
                                                                        <TableHead>Status</TableHead>
                                                                        <TableHead>Duration</TableHead>
                                                                        <TableHead>Meta</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {jobHistory?.map(run => (
                                                                        <TableRow key={run.id}>
                                                                            <TableCell className="whitespace-nowrap">{format(new Date(run.started_at), "MM/dd HH:mm")}</TableCell>
                                                                            <TableCell>{renderStatus(run.status, false)}</TableCell>
                                                                            <TableCell>{run.duration_ms}ms</TableCell>
                                                                            <TableCell className="text-xs truncate max-w-[100px]" title={JSON.stringify(run.metadata)}>
                                                                                {run.metadata ? JSON.stringify(run.metadata) : "-"}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        )}
                                                    </div>
                                                </SheetContent>
                                            </Sheet>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
