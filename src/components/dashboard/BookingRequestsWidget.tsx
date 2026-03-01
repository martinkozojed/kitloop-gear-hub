import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Inbox, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type BookingRequest = {
  id: string;
  provider_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  requested_start_date: string;
  requested_end_date: string;
  requested_gear_text: string | null;
  notes: string | null;
  status: "pending" | "converted" | "rejected";
  created_at: string;
};

export function BookingRequestsWidget({ providerId }: { providerId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["booking_requests", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_requests")
        .select("*")
        .eq("provider_id", providerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        throw error;
      }
      return data as BookingRequest[];
    },
    enabled: !!providerId,
    refetchInterval: 30000, // Poll every 30s for new requests
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("reservation_requests")
        .update({
          status: "rejected",
          handled_at: new Date().toISOString(),
          handled_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking_requests", providerId] });
      toast({ title: "Request rejected" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to reject request" });
    },
    onSettled: () => setIsProcessing(null)
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="animate-pulse bg-gray-200 h-6 w-1/3 rounded"></CardTitle></CardHeader>
        <CardContent><div className="animate-pulse bg-gray-100 h-24 rounded"></div></CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground">No pending requests</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            When customers submit a request via your public link, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <div className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full text-xs">
          {requests.length}
        </div>
        Pending Booking Requests
      </h3>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {requests.map((req) => (
          <Card key={req.id} className="relative overflow-hidden group border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span className="truncate pr-2">{req.customer_name}</span>
                <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                  {format(new Date(req.created_at), "MMM d, HH:mm")}
                </span>
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs text-blue-600/80 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(req.requested_start_date), "MMM d, yyyy")} - {format(new Date(req.requested_end_date), "MMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2 pb-3">
              <div className="text-muted-foreground">
                {(req.customer_email || req.customer_phone) && (
                  <p className="truncate">Contact: {req.customer_email || req.customer_phone}</p>
                )}
                {req.requested_gear_text && (
                  <p className="truncate font-medium text-foreground mt-1">" {req.requested_gear_text} "</p>
                )}
                {req.notes && (
                  <p className="line-clamp-2 mt-1 text-xs italic">{req.notes}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between gap-2 border-t bg-gray-50/50">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                disabled={isProcessing === req.id}
                onClick={() => {
                  setIsProcessing(req.id);
                  rejectMutation.mutate(req.id);
                }}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isProcessing === req.id}
                onClick={() => navigate(`/provider/reservations/new?request=${req.id}`)}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Detail & Convert
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
