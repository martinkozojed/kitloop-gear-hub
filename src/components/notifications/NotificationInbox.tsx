import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';
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
    is_read: boolean; // Virtual property based on if it's in deliveries yet
    outbox_id?: string;
}

export function NotificationInbox() {
    const { user, profile } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // In MVP, we fetch directly from outbox where channel = 'inapp'. 
    // In a full implementation, we'd read from a materialised view or the deliveries table.
    const fetchNotifications = React.useCallback(async () => {
        if (!user || !profile) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('notification_outbox' as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('channel', 'inapp')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Simplistic approach for MVP: anything fetched is considered unread until clicked
            // A more robust approach would track read status in a separate table
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formatted: NotificationItem[] = (data as any[]).map(n => ({
                id: n.id,
                kind: n.kind,
                payload: n.payload,
                created_at: n.created_at,
                is_read: false // Hardcoded for simplicity during prototyping
            }));

            setNotifications(formatted);
            setUnreadCount(formatted.length);
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

    const handleNotificationClick = (notification: NotificationItem) => {
        setIsOpen(false);

        // Decrease unread count (optimistic UI)
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (notification.kind === 'ops.overdue_detected') {
            navigate('/provider/dashboard'); // Or directly to reservation detail if you have the route
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

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
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
                            onClick={() => {
                                setUnreadCount(0);
                                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                            }}
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
                                    className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notification.is_read ? 'bg-muted/20' : ''
                                        }`}
                                >
                                    <div className="mt-0.5 bg-background p-1.5 rounded-full border shadow-sm">
                                        {getIconForKind(notification.kind)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm leading-tight ${!notification.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                                            {notification.payload?.message || 'Notification'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale })}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
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
