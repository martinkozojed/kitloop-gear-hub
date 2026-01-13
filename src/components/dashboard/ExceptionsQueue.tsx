import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from 'react-router-dom';

import { ExceptionItem } from "@/types/dashboard";

interface ExceptionsQueueProps {
    exceptions?: ExceptionItem[];
}

export function ExceptionsQueue({ exceptions = [] }: ExceptionsQueueProps) {
    const navigate = useNavigate();

    return (
        <Card className="h-fit">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span className="font-semibold">Requires Action</span>
                    <Badge variant="destructive" className="px-1.5 h-5">{exceptions.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                {exceptions.map((ex) => (
                    <div
                        key={ex.id}
                        className={`
              p-3 rounded-md border text-sm flex flex-col gap-2
              ${ex.priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}
            `}
                    >
                        <div className="flex items-start gap-3">
                            {ex.type === 'overdue' ? (
                                <Clock className="w-4 h-4 text-red-600 mt-0.5" />
                            ) : (
                                <CreditCard className="w-4 h-4 text-orange-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`font-medium ${ex.priority === 'high' ? 'text-red-900' : 'text-orange-900'}`}>
                                    {ex.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Customer: {ex.customer}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`w-full h-7 text-xs bg-white ${ex.priority === 'high' ? 'text-red-700 hover:text-red-800' : 'text-orange-700 hover:text-orange-800'}`}
                            onClick={() => navigate(`/provider/reservations/${ex.id}`)}
                        >
                            Resolve
                        </Button>
                    </div>
                ))}

                {exceptions.length === 0 && (
                    <EmptyState
                        icon={ShieldCheck}
                        title="System Healthy"
                        description="No critical issues found."
                        className="py-6 border-none bg-transparent"
                    />
                )}
            </CardContent>
        </Card>
    );
}
