import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
    id: string;
    kind: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    created_at: string;
    read_at: string | null; // null = unread, timestamp = read
}

export function NotificationInbox() {
    const { user, profile } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // In MVP, we fetch directly from outbox where channel = 'inapp'.
    const fetchNotifications = React.useCallback(async () => {
        if (!user || !profile) return;

        try {
            const { data, error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('notification_outbox' as any)
                .select('id, kind, payload, created_at, read_at')
                .eq('user_id', user.id)
                .eq('channel', 'inapp')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formatted: NotificationItem[] = (data as any[]).map(n => ({
                id: n.id,
                kind: n.kind,
                payload: n.payload,
                created_at: n.created_at,
                read_at: n.read_at ?? null,
            }));

            setNotifications(formatted);
            setUnreadCount(formatted.filter(n => n.read_at === null).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [user, profile]);

    useEffect(() => {
        fetchNotifications();

        // Set up realtime subscription
        if (user?.id) {
            const channel = supabase
                .channel('notification_changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notification_outbox',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        if (payload.new.channel === 'inapp') {
                            fetchNotifications();
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user, fetchNotifications]);

    /** Mark all in-app notifications as read for the current user (persisted to DB). */
    const handleMarkAllRead = async () => {
        if (!user) return;

        const unreadIds = notifications
            .filter(n => n.read_at === null)
            .map(n => n.id);

        if (unreadIds.length === 0) return;

        // Optimistic UI update
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })));
        setUnreadCount(0);

        try {
            const { error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('notification_outbox' as any)
                .update({ read_at: now })
                .eq('user_id', user.id)
                .eq('channel', 'inapp')
                .is('read_at', null);

            if (error) throw error;
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            // Roll back optimistic update
            fetchNotifications();
        }
    };

    const handleNotificationClick = async (notification: NotificationItem) => {
        setIsOpen(false);

        // Mark individual notification as read if unread
        if (notification.read_at === null && user) {
            const now = new Date().toISOString();

            // Optimistic update
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read_at: now } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            try {
                await supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from('notification_outbox' as any)
                    .update({ read_at: now })
                    .eq('id', notification.id);
            } catch {
                // Silent fail — will be correct on next fetch
            }
        }

        if (notification.kind === 'ops.overdue_detected') {
            navigate('/provider/dashboard');
        } else if (notification.kind === 'ops.pickups_tomorrow') {
            navigate('/provider/dashboard');
        }
    };

    const getIconForKind = (kind: string) => {
        switch (kind) {
            case 'ops.overdue_detected':
                return <AlertTriangle className="h-4 w-4 text-destructive" />;
            case 'ops.pickups_tomorrow':
                return <Clock className="h-4 w-4 text-blue-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const locale = i18n.language === 'cs' ? cs : enUS;
    const isRead = (n: NotificationItem) => n.read_at !== null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9" data-testid="notification-bell">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2" data-testid="notification-unread-badge">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="text-sm font-semibold">{t('notifications.title', 'Notifications')}</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllRead}
                            data-testid="notification-mark-all-read"
                        >
                            {t('notifications.markAllRead', 'Mark all read')}
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">{t('notifications.emptyMsg', "You're all caught up!")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!isRead(notification) ? 'bg-muted/20' : ''
                                        }`}
                                >
                                    <div className="mt-0.5 bg-background p-1.5 rounded-full border shadow-sm">
                                        {getIconForKind(notification.kind)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm leading-tight ${!isRead(notification) ? 'font-medium' : 'text-muted-foreground'}`}>
                                            {notification.payload?.message || 'Notification'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale })}
                                        </p>
                                    </div>
                                    {!isRead(notification) && (
                                        <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
