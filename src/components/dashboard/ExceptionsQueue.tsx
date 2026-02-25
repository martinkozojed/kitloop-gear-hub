import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/icon";

import { ExceptionItem } from "@/types/dashboard";

interface ExceptionsQueueProps {
    exceptions?: ExceptionItem[];
}

export function ExceptionsQueue({ exceptions = [] }: ExceptionsQueueProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <Card className="h-fit">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span className="font-semibold">{t('dashboard.exceptions.title')}</span>
                    <Badge variant="destructive" className="px-1.5 h-5">{exceptions.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                {exceptions.map((ex) => (
                    <div
                        key={ex.id}
                        className={`
              p-3 rounded-md border text-sm flex flex-col gap-2
              ${ex.priority === 'high' ? 'bg-status-danger/10 border-status-danger/20' : 'bg-status-warning/10 border-status-warning/20'}
            `}
                    >
                        <div className="flex items-start gap-3">
                            {ex.type === 'overdue' ? (
                                <Icon icon={Clock} className="text-status-danger mt-0.5" />
                            ) : (
                                <Icon icon={CreditCard} className="text-status-warning mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`font-medium ${ex.priority === 'high' ? 'text-status-danger' : 'text-status-warning'}`}>
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
                            className={`w-full h-7 text-xs ${ex.priority === 'high' ? 'text-status-danger hover:bg-status-danger/10' : 'text-status-warning hover:bg-status-warning/10'}`}
                            onClick={() => navigate(`/provider/reservations/edit/${ex.id}`)}
                        >
                            {t('dashboard.exceptions.resolve')}
                        </Button>
                    </div>
                ))}

                {exceptions.length === 0 && (
                    <EmptyState
                        icon={ShieldCheck}
                        title={t('dashboard.exceptions.healthyTitle')}
                        description={t('dashboard.exceptions.healthyDesc')}
                        className="py-6 border-none bg-transparent"
                    />
                )}
            </CardContent>
        </Card>
    );
}
