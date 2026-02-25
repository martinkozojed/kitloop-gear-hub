import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type AdminAuditLog = {
  id: string;
  created_at: string;
  admin_id: string;
  action: string;
  target_id: string;
  target_type: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
};

type TimePreset = "24h" | "7d" | "all";

const PAGE_SIZE = 50;
const actionOptions = ["approve_provider", "reject_provider", "other"];
const targetTypeOptions = ["provider", "reservation", "user", "bucket", "other"];

const timePresetToRange = (preset: TimePreset) => {
  if (preset === "all") return { from: undefined, to: undefined };
  const now = new Date();
  const from = new Date(now);
  if (preset === "24h") {
    from.setDate(from.getDate() - 1);
  } else if (preset === "7d") {
    from.setDate(from.getDate() - 7);
  }
  return { from: from.toISOString(), to: now.toISOString() };
};

export default function AuditLog() {
  const [timePreset, setTimePreset] = useState<TimePreset>("24h");
  const [action, setAction] = useState<string>("all");
  const [actor, setActor] = useState("");
  const [providerId, setProviderId] = useState("");
  const [targetType, setTargetType] = useState<string>("all");

  const { from, to } = useMemo(() => timePresetToRange(timePreset), [timePreset]);

  const query = useInfiniteQuery({
    queryKey: ["admin_audit_logs", { timePreset, action, actor, providerId, targetType }],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let req = supabase
        .from("admin_audit_logs")
        .select("id, created_at, admin_id, action, target_id, target_type, reason, metadata")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (from) req = req.gte("created_at", from);
      if (to) req = req.lte("created_at", to);
      if (action !== "all") req = req.eq("action", action);
      if (actor.trim()) req = req.eq("admin_id", actor.trim());
      if (providerId.trim()) req = req.eq("target_id", providerId.trim());
      if (targetType !== "all") req = req.eq("target_type", targetType);

      const { data, error, count } = await req;
      if (error) throw error;
      return {
        data: (data as AdminAuditLog[]) ?? [],
        nextPage: pageParam + PAGE_SIZE,
        hasMore: !!data && (data as AdminAuditLog[]).length === PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: { hasMore: boolean; nextPage: number }) => (lastPage.hasMore ? lastPage.nextPage : undefined),
  });

  const logs = query.data?.pages.flatMap((p: { data: AdminAuditLog[] }) => p.data) ?? [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit log</h1>
          <p className="text-muted-foreground text-sm">Admin-only view of security and system actions.</p>
        </div>
        {query.isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Time range</label>
            <Select value={timePreset} onValueChange={(v) => setTimePreset(v as TimePreset)}>
              <SelectTrigger>
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Actor (admin_id)</label>
            <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="UUID" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider / target id</label>
            <Input value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="UUID" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Target type</label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger>
                <SelectValue placeholder="Target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {targetTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle>Entries</CardTitle>
          <div className="text-sm text-muted-foreground">{logs.length} loaded</div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No audit entries for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: AdminAuditLog) => (
                  <LogRow key={log.id} log={log} />
                ))
              )}
            </TableBody>
          </Table>
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {logs.length} entries
            </div>
            {query.hasNextPage && (
              <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Load more
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const LogRow = ({ log }: { log: AdminAuditLog }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-accent" onClick={() => setOpen((p) => !p)}>
        <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}</TableCell>
        <TableCell>
          <Badge variant="outline" className="capitalize">{log.action}</Badge>
        </TableCell>
        <TableCell className="font-mono text-xs">{log.admin_id}</TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-mono text-xs">{log.target_id}</span>
            <span className="text-muted-foreground text-xs">{log.target_type}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted">
          <TableCell colSpan={5}>
            <div className="space-y-2 text-sm">
              <div className="flex gap-4 flex-wrap">
                <span><span className="font-medium">ID:</span> {log.id}</span>
                <span><span className="font-medium">Actor:</span> {log.admin_id}</span>
                <span><span className="font-medium">Target:</span> {log.target_type} / {log.target_id}</span>
                {log.reason && <span><span className="font-medium">Reason:</span> {log.reason}</span>}
              </div>
              <div className="space-y-1">
                <div className="font-medium">Metadata</div>
                <pre className="bg-background border rounded p-3 text-xs overflow-auto max-h-64">
                  {JSON.stringify(log.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
