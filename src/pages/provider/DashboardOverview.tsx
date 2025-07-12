import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DashboardOverview = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">Provider Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user?.firstName || user?.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Email: {user?.email}</p>
          <p>Phone: ---</p>
          <p>Website: ---</p>
        </CardContent>
      </Card>
      <Tabs defaultValue="gear" className="w-full">
        <TabsList>
          <TabsTrigger value="gear" asChild>
            <Link to="/provider/dashboard/gear">My Gear</Link>
          </TabsTrigger>
          <TabsTrigger value="reservations" asChild>
            <Link to="/provider/dashboard/reservations">Reservations</Link>
          </TabsTrigger>
          <TabsTrigger value="verify" asChild>
            <Link to="/provider/dashboard/verify">QR Scan</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DashboardOverview;
