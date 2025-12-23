
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Profile {
    user_id: string;
    full_name: string | null;
    email?: string; // Note: Email is usually in auth.users, not profiles, but checking if we have it or join it
    username: string | null;
    created_at: string;
    is_verified: boolean;
    role: string;
}

export default function AdminApprovals() {
    const { isAdmin, loading } = useAuth();

    // 2. Fetch Pending Providers
    const { data: pendingProviders, refetch, isLoading } = useQuery({
        queryKey: ['admin_pending_providers'],
        queryFn: async () => {
            // Note: We are fetching ALL profiles that are 'operator' or 'manager' and NOT verified
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('is_verified', false)
                .in('role', ['operator', 'manager'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Profile[];
        },
        enabled: isAdmin === true
    });

    // 3. Approve Action
    const handleApprove = async (userId: string) => {
        try {
            const { error } = await supabase.rpc('approve_provider', { target_user_id: userId });
            if (error) throw error;

            toast.success("Provider approved successfully!");
            refetch();
        } catch (error: any) {
            toast.error("Failed to approve: " + error.message);
        }
    };

    if (loading) return <div className="p-8">Checking permissions...</div>;
    if (!isAdmin) return <div className="p-8 text-red-500">Access Denied. Admins only.</div>;

    return (
        <ProviderLayout>
            <div className="space-y-8 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Approvals</h1>
                        <p className="text-muted-foreground">Review and approve new provider registrations.</p>
                    </div>
                    <Badge variant="outline" className="gap-2 bg-background">
                        <ShieldAlert className="h-4 w-4" />
                        Super Admin Mode
                    </Badge>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Pending Requests</CardTitle>
                        <CardDescription>Providers waiting for verification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Loading request data...</div>
                        ) : pendingProviders?.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/20" />
                                <p>No pending approvals. All caught up!</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User / Store</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingProviders?.map((profile) => (
                                        <TableRow key={profile.user_id}>
                                            <TableCell>
                                                <div className="font-medium">{profile.full_name || "Unknown"}</div>
                                                <div className="text-sm text-muted-foreground">{profile.username}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{profile.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right gap-2 flex justify-end">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(profile.user_id)}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="ghost">Ignore</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProviderLayout>
    );
}
