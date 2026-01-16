import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface PendingProvider {
  id: string;
  rental_name: string;
  email: string | null;
  contact_name: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

const ProviderApprovals = () => {
  const [pending, setPending] = useState<PendingProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("providers")
      .select("id, rental_name, email, contact_name, location, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load pending providers");
      setLoading(false);
      return;
    }

    setPending((data as PendingProvider[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (id: string, action: "approve_provider" | "reject_provider") => {
    setActionId(id);
    const { error, data } = await supabase.functions.invoke("admin_action", {
      body: { action, target_id: id },
    });

    if (error || !data?.success) {
      toast.error(`Failed to ${action === "approve_provider" ? "approve" : "reject"} provider`);
      setActionId(null);
      return;
    }

    toast.success(`Provider ${action === "approve_provider" ? "approved" : "rejected"}`);
    await fetchPending();
    setActionId(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading pending providers...
            </div>
          ) : pending.length === 0 ? (
            <p className="text-muted-foreground">No providers waiting for approval.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((provider) => (
                  <TableRow key={provider.id} data-testid={`pending-provider-row-${provider.id}`}>
                    <TableCell className="font-semibold">{provider.rental_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{provider.contact_name || "—"}</span>
                        <span className="text-sm text-muted-foreground">{provider.email || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{provider.location || "—"}</TableCell>
                    <TableCell>{new Date(provider.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionId === provider.id}
                        onClick={() => handleAction(provider.id, "reject_provider")}
                        data-testid={`reject-provider-${provider.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionId === provider.id}
                        onClick={() => handleAction(provider.id, "approve_provider")}
                        data-testid={`approve-provider-${provider.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
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
};

export default ProviderApprovals;
