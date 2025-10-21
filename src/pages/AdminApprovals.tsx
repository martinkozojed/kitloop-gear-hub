import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const AdminApprovals: React.FC = () => {
  const { profile } = useAuth();

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
          <CardTitle>Provider Approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            TODO: Implement provider approval flow (fetch providers with verified = false or status = 'pending' and call an approval edge function to update verified=true, approved_at=now()).
          </p>
          <Button disabled>Approve Selected (coming soon)</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApprovals;
