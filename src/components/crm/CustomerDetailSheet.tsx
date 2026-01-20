import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Loader2, Phone, Mail, Building2, MapPin, History, Activity, AlertTriangle, User, Calendar, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface CustomerDetailSheetProps {
    customerId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function CustomerDetailSheet({ customerId, open, onOpenChange, onUpdate }: CustomerDetailSheetProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any>(null); // Full 360 Object

    // Notes Editing
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    useEffect(() => {
        if (customerId && open) {
            fetchCustomer360(customerId);
        }
    }, [customerId, open]);

    const fetchCustomer360 = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_customer_360', { p_customer_id: id });
            if (error) throw error;
            setData(data);
            setNotes(data.profile.notes || '');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(t('error'), { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!customerId) return;
        setSavingNotes(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({ notes: notes })
                .eq('id', customerId);

            if (error) throw error;
            toast.success(t('operations.customerSheet.toast.notesSaved'));
            if (onUpdate) onUpdate();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(t('operations.customerSheet.toast.notesFailed'));
        } finally {
            setSavingNotes(false);
        }
    };

    const updateRiskStatus = async (status: 'safe' | 'warning' | 'blacklist') => {
        if (!customerId) return;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ risk_status: status })
                .eq('id', customerId);

            if (error) throw error;
            toast.success(t('operations.customerSheet.toast.riskUpdated', { status: status.toUpperCase() }));
            fetchCustomer360(customerId); // Refresh
            if (onUpdate) onUpdate();
        } catch (e) {
            toast.error(t('error'));
        }
    }

    const updateRiskNotes = async (text: string) => {
        if (!customerId) return;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ risk_notes: text })
                .eq('id', customerId);

            if (error) throw error;
            toast.success("Risk notes saved");
            // fetchCustomer360(customerId); // Refresh not strictly needed if we assume success, but good for sync
        } catch (e) {
            toast.error("Failed to save risk notes");
        }
    }

    if (!customerId && !open) return null;

    const profile = data?.profile;
    const account = data?.account;
    const timeline = data?.timeline || [];
    const stats = data?.stats;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                {loading || !data ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                    {profile.full_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold">{profile.full_name}</h2>
                                    {stats?.risk_score > 50 && (
                                        <Badge variant="destructive" className="ml-2">{t('operations.customerSheet.risk.highRisk')}</Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground flex flex-col gap-1">
                                    {profile.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5" />
                                            <a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>
                                        </div>
                                    )}
                                    {profile.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5" />
                                            <a href={`tel:${profile.phone}`} className="hover:underline">{profile.phone}</a>
                                        </div>
                                    )}
                                    {account && (
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span className="font-medium">{account.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions (Future placeholder) */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="w-full">
                                <Activity className="w-4 h-4 mr-2" /> {t('operations.customerSheet.quickActions.newReservation')}
                            </Button>
                            <Button variant="outline" className="w-full">
                                <Calendar className="w-4 h-4 mr-2" /> {t('operations.customerSheet.quickActions.viewCalendar')}
                            </Button>
                        </div>

                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">{t('operations.customerSheet.tabs.overview')}</TabsTrigger>
                                <TabsTrigger value="timeline">{t('operations.customerSheet.tabs.timeline')}</TabsTrigger>
                                <TabsTrigger value="profile">{t('operations.customerSheet.tabs.profile')}</TabsTrigger>
                            </TabsList>

                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('operations.customerSheet.stats.totalSpend')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{(stats?.total_spend_cents / 100).toFixed(2)} Kč</div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('operations.customerSheet.stats.activeReservations')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{stats?.active_reservations}</div>
                                            <p className="text-xs text-muted-foreground">{t('operations.customerSheet.stats.activeNow')}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* RISK MANAGEMENT CARD */}
                                <Card className={profile.risk_status === 'blacklist' ? 'border-red-500 bg-red-50' : profile.risk_status === 'warning' ? 'border-amber-500 bg-amber-50' : ''}>
                                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <AlertTriangle className={profile.risk_status === 'safe' ? 'text-gray-400' : 'text-red-600'} size={16} />
                                            {t('operations.customerSheet.risk.title')}
                                        </CardTitle>
                                        <Badge variant={profile.risk_status === 'safe' ? 'outline' : 'destructive'}>
                                            {t(`operations.customerSheet.risk.${profile.risk_status}`, { defaultValue: profile.risk_status?.toUpperCase() })}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant={profile.risk_status === 'safe' ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => updateRiskStatus('safe')}
                                                className="bg-green-600 hover:bg-green-700 text-white border-none"
                                            >
                                                {t('operations.customerSheet.risk.markSafe')}
                                            </Button>
                                            <Button
                                                variant={profile.risk_status === 'warning' ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => updateRiskStatus('warning')}
                                                className={profile.risk_status === 'warning' ? "bg-amber-600 hover:bg-amber-700" : "text-amber-600 border-amber-200 hover:bg-amber-50"}
                                            >
                                                {t('operations.customerSheet.risk.markWarning')}
                                            </Button>
                                            <Button
                                                variant={profile.risk_status === 'blacklist' ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => updateRiskStatus('blacklist')}
                                                className="col-span-2 bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                {t('operations.customerSheet.risk.markBlacklist')}
                                            </Button>
                                        </div>
                                        {(profile.risk_status !== 'safe' || profile.risk_notes) && (
                                            <div className="space-y-2">
                                                <Label className="text-xs">{t('operations.customerSheet.risk.notesLabel')}</Label>
                                                <Textarea
                                                    placeholder={t('operations.customerSheet.risk.notesPlaceholder')}
                                                    defaultValue={profile.risk_notes || ''}
                                                    onBlur={(e) => updateRiskNotes(e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    <Label>{t('operations.customerSheet.internalNotes.label')}</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t('operations.customerSheet.internalNotes.placeholder')}
                                        rows={4}
                                    />
                                    <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                                        {savingNotes ? t('operations.customerSheet.internalNotes.saving') : t('operations.customerSheet.internalNotes.save')}
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* TIMELINE TAB */}
                            <TabsContent value="timeline" className="pt-4 h-[400px]">
                                {timeline.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No events recorded.</div>
                                ) : (
                                    <div className="space-y-6 ml-2 border-l-2 border-muted pl-4">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {timeline.map((event: any) => (
                                            <div key={event.id} className="relative">
                                                <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-background border-2 border-primary" />
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(event.created_at), 'PPP p')}
                                                    </span>
                                                    <span className="font-medium text-sm">{event.title}</span>
                                                    {event.type === 'damage' && (
                                                        <Badge variant="destructive" className="w-fit">Damage</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* PROFILE TAB */}
                            <TabsContent value="profile" className="space-y-4 pt-4">
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('operations.customerSheet.profile.shoeSize')}</Label>
                                            <Input value={profile.preferences?.shoe_size || '-'} readOnly className="bg-muted" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('operations.customerSheet.profile.height')}</Label>
                                            <Input value={profile.preferences?.height_cm || '-'} readOnly className="bg-muted" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('operations.customerSheet.profile.skill')}</Label>
                                        <Input value={profile.preferences?.skill || 'Unknown'} readOnly className="bg-muted capitalize" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('operations.customerSheet.profile.tags')}</Label>
                                        <div className="flex gap-2 flex-wrap">
                                            {profile.tags?.map((tag: string) => (
                                                <Badge key={tag} variant="secondary">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
