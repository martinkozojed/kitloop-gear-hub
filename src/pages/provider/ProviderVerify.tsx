import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ProviderVerify = () => {
  const [code, setCode] = useState('');

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verify Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter QR code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button className="w-full">Scan / Verify</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderVerify;
