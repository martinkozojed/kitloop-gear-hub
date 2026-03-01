import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/telemetry';
import { onboardingSteps } from '@/content/microcopy.registry';
import {
    CheckCircle2,
    Circle,
    X,
    ArrowRight,
    Store,
    MapPin,
    Package,
    Calendar,
    FileText,
    Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Icon as UiIcon } from "@/components/ui/icon";

interface ChecklistItem {
    id: string;
    label: string;
    completed: boolean;
    href?: string;
    icon: React.ElementType;
    required: boolean;
}

interface OnboardingProgress {
    step_workspace_completed_at: string | null;
    step_location_completed_at: string | null;
    step_inventory_completed_at: string | null;
    first_reservation_at: string | null; // Matches migration column name
    checklist_terms_configured: boolean;
    checklist_team_invited: boolean;
    checklist_dismissed_at: string | null;
}

interface OnboardingChecklistProps {
    providerId: string;
    hasInventory: boolean;
    hasReservation: boolean;
    /** True when provider has completed at least one Issue flow */
    hasIssued?: boolean;
    /** True when provider has completed at least one Return flow */
    hasReturned?: boolean;
    /** True when provider has generated an export or print */
    hasExported?: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
    providerId,
    hasInventory,
    hasReservation,
    hasIssued = false,
    hasReturned = false,
    hasExported = false,
}) => {
    const { t } = useTranslation();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState<OnboardingProgress | null>(null);
    const [allDoneTriggered, setAllDoneTriggered] = useState(false);

    const loadProgress = useCallback(async () => {
        try {
            // Use type assertion for table that's not in generated types yet
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from('onboarding_progress')
                .select('*')
                .eq('provider_id', providerId)
                .single();

            if (data) {
                setProgress(data as OnboardingProgress);
                if (data.checklist_dismissed_at) {
                    setIsDismissed(true);
                }
            }
        } catch (error) {
            // No progress record yet, that's fine
        } finally {
            setIsLoading(false);
        }
    }, [providerId]);

    useEffect(() => {
        loadProgress();
    }, [loadProgress]);

    const handleDismiss = async () => {
        setIsDismissed(true);
        track('onboarding.checklist_dismissed');

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('onboarding_progress')
                .update({ checklist_dismissed_at: new Date().toISOString() })
                .eq('provider_id', providerId);
        } catch (error) {
            console.error('Failed to save dismiss state:', error);
        }
    };

    const items: ChecklistItem[] = [
        {
            id: 'workspace',
            label: t('onboarding.checklist.items.workspace'),
            completed: !!progress?.step_workspace_completed_at,
            icon: Store,
            required: true,
        },
        {
            id: 'location',
            label: t('onboarding.checklist.items.location'),
            completed: !!progress?.step_location_completed_at,
            icon: MapPin,
            required: true,
        },
        {
            id: 'inventory',
            label: t('onboarding.checklist.items.inventory'),
            // complete_when: inventory_min_items (>= 3) OR import completed
            completed: hasInventory || !!progress?.step_inventory_completed_at,
            href: '/provider/inventory',
            icon: Package,
            required: true,
        },
        {
            id: 'reservation',
            label: t('onboarding.checklist.items.reservation'),
            completed: hasReservation || !!progress?.first_reservation_at,
            href: '/provider/reservations/new',
            icon: Calendar,
            required: true,
        },
        {
            id: 'issue',
            label: t('ssot.onboarding.steps.issue.title'),
            // complete_when: issue_completed signal
            completed: hasIssued,
            href: '/provider/dashboard',
            icon: FileText,
            required: false,
        },
        {
            id: 'overview',
            label: t('ssot.onboarding.steps.overview.title'),
            // complete_when: dashboard_viewed (always true once checklist renders)
            // Deviation: ops_digest_seen signal does not exist – using dashboard_viewed
            completed: true,
            href: '/provider/dashboard',
            icon: Users,
            required: false,
        },
    ];

    // Find first incomplete step from registry for "Next Best Action" display
    const firstIncomplete = onboardingSteps.find(step => {
        const match = items.find(i => i.id === step.id);
        return match && !match.completed;
    });

    const completedCount = items.filter(item => item.completed).length;
    const totalCount = items.length;
    const progressPercent = (completedCount / totalCount) * 100;
    const allDone = completedCount === totalCount;

    // Trigger confetti on 100% completion (only once)
    useEffect(() => {
        if (allDone && !allDoneTriggered) {
            setAllDoneTriggered(true);
            track('onboarding.completed');
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#6ee7b7'],
            });
        }
    }, [allDone, allDoneTriggered]);

    // Early returns AFTER all hooks
    if (isDismissed || isLoading) return null;

    return (
        <Card className="border-status-success/30 bg-status-success/5 shadow-elevated">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                        {t('onboarding.checklist.title')}
                    </CardTitle>
                    <p className="text-sm text-status-success mt-1">
                        {t('onboarding.checklist.progress', { completed: completedCount, total: totalCount })}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-status-success hover:bg-status-success/10"
                >
                    <UiIcon icon={X} />
                </Button>
            </CardHeader>
            <CardContent className="pt-2">
                <Progress
                    value={progressPercent}
                    className="h-2 mb-4 bg-status-success/20"
                />

                {/* Next Best Action section (SSOT pilot) */}
                {firstIncomplete && !allDone && (
                    <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            {t('ssot.onboarding.header.title')}
                        </p>
                        <p className="text-sm font-medium text-foreground">{t(firstIncomplete.titleKey)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(firstIncomplete.bodyKey)}</p>
                        {firstIncomplete.ctaHref && (
                            <Link
                                to={firstIncomplete.ctaHref}
                                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline"
                            >
                                {t(firstIncomplete.ctaLabelKey)} <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                )}

                {allDone ? (
                    <div className="text-center py-4">
                        <p className="text-lg font-medium text-status-success">
                            {t('onboarding.checklist.allDone')}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((item) => {
                            return (
                                <li key={item.id}>
                                    {item.href && !item.completed ? (
                                        <Link
                                            to={item.href}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
                                        >
                                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${item.completed
                                                    ? 'bg-status-success text-status-foreground'
                                                    : 'bg-card border-2 border-border text-muted-foreground group-hover:border-ring group-hover:text-status-success'}
                      `}>
                                                {item.completed ? (
                                                    <UiIcon icon={CheckCircle2} size="md" />
                                                ) : (
                                                    <UiIcon icon={item.icon} />
                                                )}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-status-success line-through' : 'text-foreground'}`}>
                                                {item.label}
                                            </span>
                                            {!item.completed && (
                                                <UiIcon icon={ArrowRight} className="text-muted-foreground group-hover:text-status-success transition-colors" />
                                            )}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${item.completed
                                                    ? 'bg-status-success text-status-foreground'
                                                    : 'bg-card border-2 border-border text-muted-foreground'}
                      `}>
                                                {item.completed ? (
                                                    <UiIcon icon={CheckCircle2} size="md" />
                                                ) : (
                                                    <UiIcon icon={Circle} />
                                                )}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-status-success line-through' : 'text-muted-foreground'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default OnboardingChecklist;
