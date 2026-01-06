import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Mail, Calendar, User, ShoppingBag, Clock, CheckCircle2, AlertCircle, LogOut, LogIn } from "lucide-react";
import { format } from "date-fns";
import { formatPrice } from "@/lib/availability";
import { useTranslation } from 'react-i18next';
import { IssueModal, ReturnModal } from './ReservationFlows';

export default function ReservationDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { provider } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reservation, setReservation] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [assignments, setAssignments] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([]);

    const [issueOpen, setIssueOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Reservation
            const { data: res, error: resError } = await supabase
                .from('reservations')
                .select(`
                    *,
                    gear:gear_id (name, category),
                    product_variants:product_variant_id (name, products(name))
                `)
                .eq('id', id)
                .single();

            if (resError) throw resError;
            setReservation(res);

            // 2. Fetch Logs
            const { data: logData } = await supabase
                .from('notification_logs')
                .select('*')
                .eq('reservation_id', id)
                .order('sent_at', { ascending: false });

            setLogs(logData || []);

            // 3. Fetch Assignments (Assets)
            const { data: assignData } = await supabase
                .from('reservation_assignments')
                .select(`
                    id, 
                    asset_id,
                    asset:assets (
                        id, 
                        asset_tag, 
                        status,
                        product_variants (name)
                    )
                `)
                .eq('reservation_id', id);

            setAssignments(assignData || []);

        } catch (e: unknown) {
            console.error(e);
            toast.error(t('error'));
        } finally {
            setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        if (id && provider?.id) {
            fetchData();
        }
    }, [id, provider?.id, fetchData]);

    const handleResendConfirmation = async () => {
        try {
            const { error } = await supabase.rpc('mock_send_notification', {
                p_reservation_id: id,
                p_type: 'confirmation'
            });

            if (error) throw error;
            toast.success(t('reservationDetail.actions.resendSuccess'));
            fetchData(); // Refresh logs
        } catch (e) {
            toast.error(t('reservationDetail.actions.resendError'));
        }
    };

    if (loading) {
        return (
            <ProviderLayout>
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
                </div>
            </ProviderLayout>
        );
    }

    if (!reservation) return <ProviderLayout><div>{t('error')}</div></ProviderLayout>;

    const itemName = reservation.product_variants
        ? `${reservation.product_variants.products?.name} - ${reservation.product_variants.name}`
        : reservation.gear?.name || t('provider.inventory.unknown');

    const canIssue = reservation.status === 'confirmed';
    const canReturn = reservation.status === 'active';

    return (
        <ProviderLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/provider/reservations')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {t('reservationDetail.header.reservation')} #{reservation.id.slice(0, 8)}
                            <Badge variant="outline">{t(`provider.dashboard.status.${reservation.status}`, { defaultValue: reservation.status.toUpperCase() })}</Badge>
                        </h1>
                        <p className="text-muted-foreground">{t('reservationDetail.header.manage')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        <Tabs defaultValue="details">
                            <TabsList className="w-full justify-start">
                                <TabsTrigger value="details">{t('reservationDetail.tabs.details')}</TabsTrigger>
                                <TabsTrigger value="messages" className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {t('reservationDetail.tabs.messages')}
                                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 text-[10px]">{logs.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="assets" className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Vybavení
                                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 text-[10px]">{assignments.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4 pt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ShoppingBag className="w-5 h-5 text-primary" />
                                            {t('reservationDetail.cards.rentalInfo')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">{t('reservationDetail.labels.item')}</label>
                                                <div className="font-medium text-lg">{itemName}</div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">{t('reservationDetail.labels.totalPrice')}</label>
                                                <div className="font-medium text-lg">{formatPrice(reservation.total_price || 0)}</div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">{t('reservationDetail.labels.start')}</label>
                                                <div className="font-medium flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(reservation.start_date), 'dd.MM.yyyy HH:mm')}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">{t('reservationDetail.labels.end')}</label>
                                                <div className="font-medium flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(reservation.end_date), 'dd.MM.yyyy HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="w-5 h-5 text-primary" />
                                            {t('reservationDetail.cards.customer')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="font-medium text-lg">{reservation.customer_name}</div>
                                            <div className="text-muted-foreground">{reservation.customer_email}</div>
                                            <div className="text-muted-foreground">{reservation.customer_phone}</div>
                                            {reservation.notes && (
                                                <div className="mt-4 p-3 bg-muted rounded-md text-sm border-l-4 border-primary">
                                                    <span className="font-bold block mb-1">{t('reservationDetail.labels.notes')}:</span>
                                                    {reservation.notes}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="messages" className="pt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>{t('reservationDetail.cards.history')}</span>
                                        </CardTitle>
                                        <CardDescription>{t('reservationDetail.cards.historyDesc')}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {logs.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                                                {t('reservationDetail.cards.noMessages')}
                                            </div>
                                        ) : (
                                            <div className="space-y-6 relative border-l-2 border-muted ml-3 pl-6 py-2">
                                                {logs.map((log) => (
                                                    <div key={log.id} className="relative">
                                                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${log.status === 'sent' ? 'bg-green-100 border-green-600' : 'bg-red-100 border-red-600'
                                                            }`} />

                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-semibold text-sm uppercase tracking-wide text-primary">
                                                                    {t(`reservationDetail.messageTypes.${log.type}`, { defaultValue: log.type })}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {format(new Date(log.sent_at), 'dd.MM. HH:mm')}
                                                                </span>
                                                            </div>
                                                            <div className="font-medium">{log.subject}</div>
                                                            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground mt-1">
                                                                {log.content_preview}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="assets" className="pt-4">
                                <Card>
                                    <CardHeader><CardTitle>Přiřazené Vybavení</CardTitle></CardHeader>
                                    <CardContent>
                                        {assignments.length === 0 ? (
                                            <p className="text-muted-foreground italic">Žádné kusy zatím nebyly přiřazeny.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {assignments.map(a => (
                                                    <li key={a.id} className="flex justify-between p-2 border rounded">
                                                        <span className="font-medium">{a.asset?.asset_tag || 'N/A'}</span>
                                                        <Badge variant="outline">{a.asset?.status || 'Unknown'}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar / Actions */}
                    <div className="space-y-6">
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader><CardTitle>{t('reservationDetail.cards.actions')}</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {canIssue && (
                                    <Button className="w-full text-lg h-12" onClick={() => setIssueOpen(true)}>
                                        <LogOut className="w-5 h-5 mr-2" /> Vydat Zákazníkovi
                                    </Button>
                                )}
                                {canReturn && (
                                    <Button className="w-full text-lg h-12" onClick={() => setReturnOpen(true)} variant="outline">
                                        <LogIn className="w-5 h-5 mr-2" /> Přijmout Vrácení
                                    </Button>
                                )}

                                <div className="h-px bg-border my-2" />

                                <Button
                                    className="w-full"
                                    variant="secondary"
                                    onClick={handleResendConfirmation}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    {t('reservationDetail.actions.resend')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {id && provider?.id && (
                    <>
                        <IssueModal
                            open={issueOpen}
                            onClose={() => setIssueOpen(false)}
                            reservationId={id}
                            providerId={provider.id}
                            onSuccess={fetchData}
                        />
                        <ReturnModal
                            open={returnOpen}
                            onClose={() => setReturnOpen(false)}
                            reservationId={id}
                            providerId={provider.id}
                            assets={assignments}
                            onSuccess={fetchData}
                        />
                    </>
                )}
            </div>
        </ProviderLayout>
    );
}
