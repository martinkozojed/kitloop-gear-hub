import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/telemetry';
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
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
    providerId,
    hasInventory,
    hasReservation,
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

    // Build checklist items dynamically
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
            id: 'terms',
            label: t('onboarding.checklist.items.terms'),
            completed: !!progress?.checklist_terms_configured,
            href: '/provider/settings',
            icon: FileText,
            required: false,
        },
        {
            id: 'team',
            label: t('onboarding.checklist.items.team'),
            completed: !!progress?.checklist_team_invited,
            href: '/provider/settings#team',
            icon: Users,
            required: false,
        },
    ];

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
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-semibold text-emerald-900">
                        {t('onboarding.checklist.title')}
                    </CardTitle>
                    <p className="text-sm text-emerald-600 mt-1">
                        {t('onboarding.checklist.progress', { completed: completedCount, total: totalCount })}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
                >
                    <UiIcon icon={X} />
                </Button>
            </CardHeader>
            <CardContent className="pt-2">
                <Progress
                    value={progressPercent}
                    className="h-2 mb-4 bg-emerald-100"
                />

                {allDone ? (
                    <div className="text-center py-4">
                        <p className="text-lg font-medium text-emerald-700">
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
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/60 transition-colors group"
                                        >
                                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${item.completed
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-white border-2 border-gray-200 text-gray-400 group-hover:border-emerald-400 group-hover:text-emerald-500'}
                      `}>
                                                {item.completed ? (
                                                    <UiIcon icon={CheckCircle2} size="md" />
                                                ) : (
                                                    <UiIcon icon={item.icon} />
                                                )}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-emerald-700 line-through' : 'text-gray-700'}`}>
                                                {item.label}
                                            </span>
                                            {!item.completed && (
                                                <UiIcon icon={ArrowRight} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                            )}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2">
                                            <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${item.completed
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-white border-2 border-gray-200 text-gray-400'}
                      `}>
                                                {item.completed ? (
                                                    <UiIcon icon={CheckCircle2} size="md" />
                                                ) : (
                                                    <UiIcon icon={Circle} />
                                                )}
                                            </div>
                                            <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-emerald-700 line-through' : 'text-gray-500'}`}>
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
