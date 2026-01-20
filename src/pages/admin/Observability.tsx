
import { CronJobsSection, CronHealth } from "@/components/analytics/sections/CronJobsSection";

// ... existing imports

export default function Observability() {
    // ... existing state

    const { data: logs, isLoading } = useQuery({ /* ... */ });

    const { data: cronHealth, isLoading: cronHealthLoading } = useQuery({
        queryKey: ["cron_health"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_cron_health");
            if (error) throw error;
            return data as unknown as CronHealth[];
        }
    });

    const { data: cronRuns, isLoading: cronLoading } = useQuery({ /* ... */ });

    // ... existing derived state (latestCleanup etc)

    const renderCronStatus = (status: string, testId?: string) => { /* ... */ };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">System Observability</h1>
            </div>

            {/* RPC Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
               {/* ... existing RPC cards ... */}
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
                                ? Math.round(logs.reduce((acc, log) => acc + (log.duration_ms || 0), 0) / logs.length)
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
                                ? Math.round((logs.filter(l => !l.success).length / logs.length) * 100)
                                : 0}%
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired Holds (Last Run)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestCleanupDeleted ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestCleanup ? (
                                <>
                                    Last run: {format(new Date(latestCleanup.started_at), "HH:mm")}
                                    {latestCleanup.status === "failed" && <span className="text-red-500 ml-1">(Failed)</span>}
                                </>
                            ) : "No data"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* New Cron Jobs Section */}
            <CronJobsSection data={cronHealth || []} isLoading={cronHealthLoading} />
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expired Holds (Last Run)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestCleanupDeleted ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestCleanup ? (
                                <>
                                    Last run: {format(new Date(latestCleanup.started_at), "HH:mm")}
                                    {latestCleanup.status === "failed" && <span className="text-red-500 ml-1">(Failed)</span>}
                                </>
                            ) : "No data"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>RPC Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    {errorMsg ? (
                        <div className="text-sm text-red-600">{errorMsg}</div>
                    ) : (
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
                                ) : logs?.map((log) => (
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
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cron Runs</CardTitle>
                </CardHeader>
                <CardContent>
                    {cronError ? (
                        <div className="text-sm text-red-600">{cronError}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Started</TableHead>
                                    <TableHead>Cron</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cronLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : (cronRuns?.length ?? 0) === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                                            No cron runs recorded.
                                        </TableCell>
                                    </TableRow>
                                ) : cronRuns?.map((run) => {
                                    const meta = (run.metadata as Record<string, unknown> | null) || null;
                                    const deletedCount = typeof meta?.deleted_count === "number" ? meta.deleted_count : null;
                                    const detail = run.error_message || (deletedCount !== null ? `Deleted ${deletedCount}` : "—");

                                    return (
                                        <TableRow key={run.id} data-testid={`cron-run-row-${run.id}`}>
                                            <TableCell>{format(new Date(run.started_at), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                                            <TableCell className="font-mono">{run.cron_name}</TableCell>
                                            <TableCell>{renderCronStatus(run.status, `cron-status-${run.id}`)}</TableCell>
                                            <TableCell>{run.duration_ms ? `${run.duration_ms} ms` : "—"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={detail}>
                                                {detail}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
