import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { Bell, CheckCircle2, AlertTriangle, Clock, Package, MoreVertical, Trash2, MailOpen, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
    id: string;
    kind: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    created_at: string;
    read_at: string | null;
}

export default function ProviderNotifications() {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'cs' ? cs : enUS;

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notification_outbox')
                .select('id, kind, payload, created_at, read_at')
                .eq('user_id', user.id)
                .eq('channel', 'inapp')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const formattedData = (data as unknown as NotificationItem[]) || [];
            setNotifications(formattedData);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        if (!user) return;
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: now } : n));
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('notification_outbox') as any)
                .update({ read_at: now })
                .eq('id', id);
        } catch {
            fetchNotifications();
        }
    };

    const markAsUnread = async (id: string) => {
        if (!user) return;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n));
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('notification_outbox') as any)
                .update({ read_at: null })
                .eq('id', id);
        } catch {
            fetchNotifications();
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || now })));
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('notification_outbox') as any)
                .update({ read_at: now })
                .eq('user_id', user.id)
                .eq('channel', 'inapp')
                .is('read_at', null);
        } catch {
            fetchNotifications();
        }
    };

    const getIconForKind = (kind: string) => {
        switch (kind) {
            case 'ops.overdue_detected': return <AlertTriangle className="h-5 w-5 text-destructive" />;
            case 'ops.pickups_tomorrow': return <Clock className="h-5 w-5 text-blue-500" />;
            case 'ops.returns_tomorrow': return <Package className="h-5 w-5 text-emerald-500" />;
            default: return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

    return (
        <div className="max-w-4xl mx-auto py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground mt-1">
                        You have {unreadCount} unread message{unreadCount !== 1 && 's'}.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0 || loading}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                </div>
            </div>

            <Card>
                <div className="divide-y divide-border">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="p-4 flex items-start gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))
                    ) : notifications.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold">You're all caught up!</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                When you get new notifications about reservations, inventory, or system alerts, they will appear here.
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const isUnread = !notification.read_at;
                            return (
                                <div
                                    key={notification.id}
                                    className={`p-4 md:p-5 flex gap-4 items-start transition-colors group ${isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-background hover:bg-muted/50'
                                        }`}
                                >
                                    <div className={`mt-0.5 rounded-full p-2 shrink-0 ${isUnread ? 'bg-background shadow-sm ring-1 ring-border/50' : ''}`}>
                                        {getIconForKind(notification.kind)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <p className={`text-base ${isUnread ? 'font-semibold text-foreground' : 'text-foreground/80 font-medium'}`}>
                                                {notification.payload?.message || 'New Notification'}
                                            </p>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale })}
                                                </span>

                                                {/* Dropdown for quick actions */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {isUnread ? (
                                                            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                                                <MailOpen className="h-4 w-4 mr-2" />
                                                                Mark as read
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => markAsUnread(notification.id)}>
                                                                <Mail className="h-4 w-4 mr-2" />
                                                                Mark as unread
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        {isUnread && (
                                            <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
                                                Unread
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>
        </div>
    );
}
