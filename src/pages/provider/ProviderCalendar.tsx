import React from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProviderCalendar = () => {
    return (
        <ProviderLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kalendář</h1>
                    <p className="text-muted-foreground">Vizuální přehled rezervací</p>
                </div>

                <Card className="border-2 border-dashed border-emerald-100 bg-emerald-50/30">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                            <CalendarIcon className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-emerald-900 mb-2">Chytrý Kalendář</h2>
                        <p className="text-muted-foreground max-w-md mb-8">
                            Tato funkce je momentálně ve vývoji. Brzy zde uvidíte všechny své rezervace v přehledném kalendářovém zobrazení s možností drag & drop.
                        </p>
                        <div className="flex gap-4">
                            <Button variant="outline" asChild>
                                <Link to="/provider/reservations">Přejít na Seznam rezervací</Link>
                            </Button>
                            <Button disabled variant="primary">Upozornit až bude hotovo</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ProviderLayout>
    );
};

export default ProviderCalendar;
