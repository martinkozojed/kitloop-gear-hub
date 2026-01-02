import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ItemState } from "@/lib/logic/reservation-state";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PrintContractButton } from '@/components/contracts/PrintContractButton';
import { useTranslation } from 'react-i18next';

import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface IssueFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, isOverride: boolean) => Promise<void>;
}

export function IssueFlow({ open, onOpenChange, reservation, onConfirm }: IssueFlowProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const [items, setItems] = useState<ItemState[]>([]);
    const [fetchingItems, setFetchingItems] = useState(false);
    const [overrideMode, setOverrideMode] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
    const [reservationRecord, setReservationRecord] = useState<{
        id: string;
        status: string;
        payment_status: string | null;
        start_date: string;
        end_date: string;
        product_variant_id: string | null;
        provider_id: string | null;
    } | null>(null);

    const buildItems = (rows: any[]) => {
        return (rows || []).map((d: any) => ({
            id: d.asset_id,
            status: d.assets?.status
        })) as ItemState[];
    };

    const fetchReservation = useCallback(async () => {
        if (!open || !reservation.id) return;
        setFetchingItems(true);
        setAutoAssignError(null);
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('id, status, payment_status, start_date, end_date, product_variant_id, provider_id, reservation_assignments(asset_id, assets(id, status))')
                .eq('id', reservation.id)
                .single();

            if (error) throw error;
            setReservationRecord({
                id: data.id,
                status: data.status,
                payment_status: data.payment_status,
                start_date: data.start_date,
                end_date: data.end_date,
                product_variant_id: data.product_variant_id,
                provider_id: data.provider_id,
            });
            const mapped = buildItems(data.reservation_assignments || []);
            setItems(mapped);

            // Auto-assign if no items and we know the variant
            if ((!mapped || mapped.length === 0) && data.product_variant_id && data.provider_id) {
                await autoAssignAsset(data);
            }
        } catch (err: any) {
            console.error('Failed to fetch reservation for issue flow', err);
            toast.error(t('error'));
        } finally {
            setFetchingItems(false);
        }
    }, [open, reservation.id, t, autoAssignAsset]);

    const autoAssignAsset = useCallback(async (res: any) => {
        setAutoAssigning(true);
        setAutoAssignError(null);
        try {
            if (!res.start_date || !res.end_date) {
                setAutoAssignError('Rezervace nemá platný termín pro přiřazení.');
                return;
            }
            const { data: candidates, error: candidateError } = await supabase
                .from('assets')
                .select('id, status, asset_tag')
                .eq('variant_id', res.product_variant_id)
                .eq('provider_id', res.provider_id)
                .not('status', 'in', '("maintenance","retired","lost")');

            if (candidateError) throw candidateError;

            if (!candidates || candidates.length === 0) {
                setAutoAssignError('Žádné dostupné kusy k přiřazení');
                return;
            }

            for (const asset of candidates) {
                const { data: conflicts, error: conflictError } = await supabase
                    .from('reservation_assignments')
                    .select('reservation:reservations!inner(start_date,end_date,status)')
                    .eq('asset_id', asset.id)
                    .in('reservations.status', ['hold', 'confirmed', 'active'])
                    .lt('reservations.start_date', res.end_date)
                    .gt('reservations.end_date', res.start_date);

                if (conflictError) throw conflictError;
                const hasConflict = (conflicts || []).length > 0;
                if (hasConflict) {
                    continue;
                }

                const { error: insertError } = await supabase
                    .from('reservation_assignments')
                    .insert({ reservation_id: res.id, asset_id: asset.id });

                if (insertError) throw insertError;

                setItems(prev => [...prev, { id: asset.id, status: asset.status as ItemState['status'] }]);
                toast.success(`Automaticky přiřazen kus ${asset.asset_tag || asset.id}`);
                return;
            }

            setAutoAssignError('Nepodařilo se najít volný kus pro tento termín.');
        } catch (err: any) {
            console.error('Auto-assign failed', err);
            setAutoAssignError(err.message || 'Auto-assign selhal');
        } finally {
            setAutoAssigning(false);
        }
    }, []);

    useEffect(() => {
        fetchReservation();
    }, [fetchReservation]);

    const hasAssets = items.length > 0;
    const paymentStatus = reservationRecord?.payment_status || 'unpaid';
    const isPaidEnough = ['paid', 'deposit_paid'].includes(paymentStatus);
    const isAllowed = !!reservationRecord && reservationRecord.status === 'confirmed' && isPaidEnough && hasAssets;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(reservation.id, overrideMode);
            onOpenChange(false);
        } catch (e: any) {
            console.error(e);
            toast.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    // Shortcut: Cmd+Enter (or Ctrl+Enter) to confirm
    useKeyboardShortcut(
        { key: 'Enter', metaOrCtrl: true },
        () => {
            if (!loading && (isAllowed || overrideMode)) {
                handleConfirm();
            }
        },
        { enabled: open }
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isAllowed || overrideMode ? (
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <Lock className="w-5 h-5 text-red-600" />
                        )}
                        {t('operations.issueFlow.title')} #{reservation.id}
                    </DialogTitle>
                    <DialogDescription>
                        {reservation.customerName} - {reservation.itemName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {!hasAssets && !overrideMode ? (
                        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {t('operations.issueFlow.noAssets.title')}
                            </div>
                            <p className="text-sm">
                                {t('operations.issueFlow.noAssets.desc')}
                            </p>
                            {autoAssigning && <p className="text-xs text-muted-foreground">Hledám dostupný kus...</p>}
                            {autoAssignError && <p className="text-xs text-red-700">{autoAssignError}</p>}
                        </div>
                    ) : !isAllowed && !overrideMode ? (
                        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {t('operations.issueFlow.blocked.title')}
                            </div>
                            <p className="text-sm">
                                {t('operations.issueFlow.blocked.desc')} <strong>{paymentStatus}</strong>.
                                {t('operations.issueFlow.blocked.descSuffix')}
                            </p>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => setOverrideMode(true)}
                            >
                                {t('operations.issueFlow.blocked.override')}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                                {t('operations.issueFlow.ready')}
                            </div>

                            {overrideMode && (
                                <p className="text-xs text-orange-600 font-medium text-center">
                                    {t('operations.issueFlow.overrideActive')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t('operations.issueFlow.cancel')}
                        </Button>
                        <PrintContractButton reservationId={reservation.id} label={t('operations.issueFlow.contract')} />
                    </div>                    <Button
                        onClick={handleConfirm}
                        disabled={(!isAllowed && !overrideMode) || loading || fetchingItems || autoAssigning}
                        className={overrideMode ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}
                    >
                        {loading ? t('provider.dashboard.agenda.processing') : t('operations.issueFlow.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
