import React, { useState } from 'react';
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
import { canIssue, ReservationState, ItemState } from "@/lib/logic/reservation-state";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PrintContractButton } from '@/components/contracts/PrintContractButton';
import { useTranslation } from 'react-i18next';

import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface IssueFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: ReservationState & { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, isOverride: boolean) => Promise<void>;
}

export function IssueFlow({ open, onOpenChange, reservation, onConfirm }: IssueFlowProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // 1. Fetch Real Items State
    const [items, setItems] = useState<ItemState[]>([]);
    const [fetchingItems, setFetchingItems] = useState(false);

    React.useEffect(() => {
        if (open && reservation.id) {
            setFetchingItems(true);
            const fetchItems = async () => {
                const { data } = await supabase
                    .from('reservation_assignments')
                    .select('asset_id, assets(id, status)')
                    .eq('reservation_id', reservation.id)
                    .is('returned_at', null);

                const realItems = (data || []).map((d: any) => ({
                    id: d.asset_id,
                    status: d.assets?.status
                }));
                setItems(realItems);
                setFetchingItems(false);
            };
            fetchItems();
        }
    }, [open, reservation.id]);

    // 2. Guardrail Check
    // If no items assigned, we can't issue anything (unless we allow "Demand Only" issue, but for now strict)
    const hasAssets = items.length > 0;
    const isAllowed = canIssue(reservation, items) && hasAssets;
    const [overrideMode, setOverrideMode] = useState(false);

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
                        </div>
                    ) : !isAllowed && !overrideMode ? (
                        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {t('operations.issueFlow.blocked.title')}
                            </div>
                            <p className="text-sm">
                                {t('operations.issueFlow.blocked.desc')} <strong>{reservation.paymentStatus}</strong>.
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
                        disabled={(!isAllowed && !overrideMode) || loading}
                        className={overrideMode ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}
                    >
                        {loading ? t('provider.dashboard.agenda.processing') : t('operations.issueFlow.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
