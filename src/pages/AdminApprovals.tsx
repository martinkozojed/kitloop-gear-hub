import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ProviderApplication {
  id: string;
  rental_name: string | null;
  contact_name: string | null;
  email: string | null;
  location: string | null;
  status: string | null;
  created_at: string;
}

const AdminApprovals: React.FC = () => {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (providerId: string, action: 'approve_provider' | 'reject_provider') => {
    setActionLoading(providerId);
    try {
      const { error } = await supabase.functions.invoke('admin_action', {
        body: {
          action,
          target_id: providerId,
        },
      });

      if (error) throw error;

      toast.success(`Provider ${action === 'approve_provider' ? 'approved' : 'rejected'} successfully`);
      fetchApplications(); // Refresh list
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Access restricted. Admin role required.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Provider Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No pending applications found.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="border bg-slate-50/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{app.rental_name || 'Unnamed Rental'}</h3>
                        <p className="text-sm text-muted-foreground">Contact: {app.contact_name} ({app.email})</p>
                        <p className="text-sm text-muted-foreground">Location: {app.location}</p>
                        <p className="text-xs text-muted-foreground">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleAction(app.id, 'reject_provider')}
                          disabled={!!actionLoading}
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleAction(app.id, 'approve_provider')}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApprovals;
