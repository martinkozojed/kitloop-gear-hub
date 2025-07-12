import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const mockReservations = [
  {
    id: 1,
    gear: 'Tent',
    customer: 'Alice',
    from: '2024-05-01',
    to: '2024-05-03',
    status: 'pending',
  },
];

const ProviderReservations = () => {
  return (
    <div className="container mx-auto py-10 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Reservations</h2>
      {mockReservations.map((res) => (
        <Card key={res.id}>
          <CardHeader>
            <CardTitle>{res.gear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">{res.customer}</p>
            <p>
              {res.from} – {res.to}
            </p>
            <Badge className="capitalize">{res.status}</Badge>
            <div className="flex gap-2 mt-2">
              <Button size="sm">Confirm pickup</Button>
              <Button size="sm">Confirm return</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProviderReservations;
