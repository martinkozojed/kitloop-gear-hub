
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface RpcLog {
    id: string;
    rpc_name: string;
    duration_ms: number;
    success: boolean;
    error_details: string | null;
    created_at: string;
}

export default function Observability() {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { data: logs, isLoading } = useQuery({
        queryKey: ["rpc_logs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("rpc_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) {
                if (error.code === "PGRST301" || error.code === "42501") {
                    setErrorMsg("Nemáte oprávnění zobrazit tyto záznamy.");
                } else {
                    setErrorMsg("Nepodařilo se načíst logy.");
                }
                throw error;
            }
            return data as unknown as RpcLog[];
        },
    });

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">System Observability</h1>
            </div>

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
        </div>
    );
}
