import React from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProviderCustomers = () => {
    return (
        <ProviderLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Databáze Zákazníků</h1>
                    <p className="text-muted-foreground">Správa kontaktů a historie výpůjček</p>
                </div>

                <Card className="border-2 border-dashed border-blue-100 bg-blue-50/30">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                            <Users className="w-12 h-12 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-blue-900 mb-2">CRM systém</h2>
                        <p className="text-muted-foreground max-w-md mb-8">
                            Připravujeme pro vás detailní databázi zákazníků. Uvidíte zde historii výpůjček, preference a spolehlivost každého klienta.
                        </p>
                        <div className="flex gap-4">
                            <Button disabled variant="primary">Upozornit až bude hotovo</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ProviderLayout>
    );
};

export default ProviderCustomers;
