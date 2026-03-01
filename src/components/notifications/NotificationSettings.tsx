import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export function NotificationSettings({ isEditEnabled }: { isEditEnabled: boolean }) {
    const { provider, user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState({
        email_enabled: true,
        inapp_enabled: true,
        daily_digest: true,
        quiet_hours_enabled: false
    });

    useEffect(() => {
        async function loadPrefs() {
            if (!provider || !user) return;

            try {
                const { data, error } = await supabase
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .from('notification_preferences' as any)
                    .select('*')
                    .eq('provider_id', provider.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error("Error loading notification preferences", error);
                } else if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prefs = data as any;
                    setPreferences({
                        email_enabled: prefs.email_enabled ?? true,
                        inapp_enabled: prefs.inapp_enabled ?? true,
                        daily_digest: prefs.daily_digest ?? true,
                        quiet_hours_enabled: prefs.quiet_hours_enabled ?? false
                    });
                }
            } finally {
                setLoading(false);
            }
        }

        loadPrefs();
    }, [provider, user]);

    const handleToggle = async (key: keyof typeof preferences, checked: boolean) => {
        if (!provider || !user || !isEditEnabled) return;

        // Optimistic UI update
        setPreferences(prev => ({ ...prev, [key]: checked }));
        setSaving(true);

        try {
            const { error } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('notification_preferences' as any)
                .upsert({
                    provider_id: provider.id,
                    user_id: user.id,
                    [key]: checked,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success(t('provider.settings.toasts.saved'));
        } catch (err) {
            console.error("Failed to save notification preference", err);
            toast.error(t('provider.settings.toasts.error'));
            // Revert optimistic update
            setPreferences(prev => ({ ...prev, [key]: !checked }));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{t('provider.settings.notifications.channels', 'Channels')}</CardTitle>
                    <CardDescription>
                        {t('provider.settings.notifications.channelsDesc', 'How would you like to receive important updates?')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                            <Label className="text-base">{t('provider.settings.notifications.email', 'Email Notifications')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('provider.settings.notifications.emailDesc', 'Receive alerts to your inbox.')}
                            </p>
                        </div>
                        <Switch
                            checked={preferences.email_enabled}
                            onCheckedChange={(c) => handleToggle('email_enabled', c)}
                            disabled={!isEditEnabled || saving}
                        />
                    </div>

                    <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                            <Label className="text-base">{t('provider.settings.notifications.inapp', 'In-App Notifications')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('provider.settings.notifications.inappDesc', 'Get notified instantly while using the web application.')}
                            </p>
                        </div>
                        <Switch
                            checked={preferences.inapp_enabled}
                            onCheckedChange={(c) => handleToggle('inapp_enabled', c)}
                            disabled={!isEditEnabled || saving}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{t('provider.settings.notifications.reports', 'Digests & Reports')}</CardTitle>
                    <CardDescription>
                        {t('provider.settings.notifications.reportsDesc', 'Control automated summaries and operational digests.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                            <Label className="text-base">{t('provider.settings.notifications.dailyDigest', 'Daily Operational Digest')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('provider.settings.notifications.dailyDigestDesc', 'Receive a morning summary of today\'s upcoming pickups, returns, and overdue items.')}
                            </p>
                        </div>
                        <Switch
                            checked={preferences.daily_digest}
                            onCheckedChange={(c) => handleToggle('daily_digest', c)}
                            disabled={!isEditEnabled || saving}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{t('provider.settings.notifications.doNotDisturb', 'Do Not Disturb')}</CardTitle>
                    <CardDescription>
                        {t('provider.settings.notifications.doNotDisturbDesc', 'Pause notifications during nights and weekends.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">{t('provider.settings.notifications.quietHours', 'Enable Quiet Hours')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('provider.settings.notifications.quietHoursDesc', 'Non-critical notifications will be silenced from 8PM to 8AM.')}
                            </p>
                        </div>
                        <Switch
                            checked={preferences.quiet_hours_enabled}
                            onCheckedChange={(c) => handleToggle('quiet_hours_enabled', c)}
                            disabled={!isEditEnabled || saving}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
