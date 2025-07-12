import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockGear = [
  { id: 1, name: 'Tent', type: 'Camping', status: 'Available' },
  { id: 2, name: 'Backpack', type: 'Hiking', status: 'Out' },
];

const ProviderGear = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">My Gear</h2>
        <Button>Add New Gear</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockGear.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm flex-grow">
              <p className="text-muted-foreground">{item.type}</p>
              <p>Status: {item.status}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline">Edit</Button>
                <Button size="sm" variant="destructive">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProviderGear;
