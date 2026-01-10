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
import { AlertTriangle, Lock, ShieldCheck, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PrintContractButton } from '@/components/contracts/PrintContractButton';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
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

    interface AssetAssignment {
        asset_id: string;
        assets: { status: string } | null;
    }
    const buildItems = (rows: AssetAssignment[]) => {
        return (rows || []).map((d) => ({
            id: d.asset_id,
            status: d.assets?.status as ItemState['status']
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
            interface AssetAssigmentResponse {
                asset_id: string;
                assets: { id: string; status: string; } | null;
            }
            const rawAssignments = data.reservation_assignments as unknown as AssetAssigmentResponse[];

            const mapped = buildItems(rawAssignments || []);
            setItems(mapped);

            if ((!mapped || mapped.length === 0) && data.product_variant_id && data.provider_id) {
                // We know IDs are present
                await autoAssignAsset({
                    id: data.id,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    product_variant_id: data.product_variant_id,
                    provider_id: data.provider_id
                });
            }
        } catch (err: unknown) {
            console.error('Failed to fetch reservation', err);
            toast.error(t('error'));
        } finally {
            setFetchingItems(false);
        }
    }, [open, reservation.id, t]);

    interface ReservationData {
        id: string;
        start_date: string;
        end_date: string;
        product_variant_id: string | null;
        provider_id: string | null;
    }
    const autoAssignAsset = async (res: ReservationData) => {
        setAutoAssigning(true);
        setAutoAssignError(null);
        try {
            if (!res.start_date || !res.end_date) {
                setAutoAssignError('Invalid dates'); return;
            }
            const { data: candidates } = await supabase
                .from('assets')
                .select('id, status, asset_tag')
                .eq('variant_id', res.product_variant_id!)
                .eq('provider_id', res.provider_id!)
                .not('status', 'in', '("maintenance","retired","lost")');

            if (!candidates?.length) {
                setAutoAssignError('No assets available'); return;
            }

            for (const asset of candidates) {
                const { data: conflicts } = await supabase
                    .from('reservation_assignments')
                    .select('reservation:reservations!inner(start_date,end_date,status)')
                    .eq('asset_id', asset.id)
                    .in('reservations.status', ['hold', 'confirmed', 'active'])
                    .lt('reservations.start_date', res.end_date)
                    .gt('reservations.end_date', res.start_date);

                if (!conflicts?.length) {
                    const { error: insertError } = await supabase
                        .from('reservation_assignments')
                        .insert({ reservation_id: res.id, asset_id: asset.id });

                    if (insertError) throw insertError;
                    setItems(prev => [...prev, { id: asset.id, status: asset.status as ItemState['status'] }]);
                    toast.success(`Auto-assigned: ${asset.asset_tag || asset.id}`);
                    return;
                }
            }
            setAutoAssignError('No assets available for this date');
        } catch (err: unknown) {
            console.error('Auto-assign failed', err);
            setAutoAssignError('Auto-assign failed');
        } finally {
            setAutoAssigning(false);
        }
    };

    useEffect(() => {
        fetchReservation();
    }, [fetchReservation]);

    const hasAssets = items.length > 0;
    const paymentStatus = reservationRecord?.payment_status || 'unpaid';
    const isPaidEnough = ['paid', 'deposit_paid'].includes(paymentStatus);
    const isAllowed = !!reservationRecord && reservationRecord.status === 'confirmed' && isPaidEnough && hasAssets;

    const handleConfirm = async () => {
        if (!reservationRecord?.provider_id) return;
        setLoading(true);
        try {
            const userResult = await supabase.auth.getUser();
            const userId = userResult.data.user?.id;

            if (!userId) throw new Error("Not authenticated");

            // Strict RPC Call
            // @ts-ignore - RPC types might be stale
            const { data, error } = await supabase.rpc('issue_reservation', {
                p_reservation_id: reservation.id,
                p_provider_id: reservationRecord.provider_id,
                p_user_id: userId,
                p_override: overrideMode,
                p_override_reason: overrideMode ? 'Manual override by provider' : null
            });

            if (error) throw error;

            toast.success(t('operations.issueFlow.success', 'Reservation Issued'));
            await onConfirm(reservation.id, overrideMode); // Refresh parent
            onOpenChange(false);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.error(e);
            toast.error(message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    const StatusDisplay = () => {
        if (!hasAssets && !overrideMode) {
            return (
                <div className="flex flex-col items-center justify-center p-6 text-center text-amber-600 bg-amber-50 rounded-xl border border-amber-100 animate-in fade-in zoom-in duration-300">
                    <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
                    <h4 className="font-semibold">{t('operations.issueFlow.noAssets.title')}</h4>
                    <p className="text-sm opacity-80 mt-1 max-w-[250px]">{t('operations.issueFlow.noAssets.desc')}</p>
                    {autoAssigning && <div className="mt-2 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Finding asset...</div>}
                    {autoAssignError && <p className="mt-1 text-xs font-bold text-red-600">{autoAssignError}</p>}
                </div>
            );
        }
        if (!isAllowed && !overrideMode) {
            return (
                <div className="flex flex-col items-center justify-center p-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
                    <Lock className="w-8 h-8 mb-2 opacity-80" />
                    <h4 className="font-semibold">{t('operations.issueFlow.blocked.title')}</h4>
                    <p className="text-sm opacity-80 mt-1">Payment Status: <strong>{paymentStatus}</strong></p>

                    <Button variant="ghost" size="sm" onClick={() => setOverrideMode(true)} className="mt-4 hover:bg-red-100 hover:text-red-700 underline text-xs">
                        {t('operations.issueFlow.blocked.override')}
                    </Button>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-emerald-800">Ready to Issue</h4>
                <p className="text-sm text-emerald-600/80 mt-1">Everything looks correct.</p>
                {overrideMode && <span className="text-[10px] uppercase font-bold text-orange-500 mt-2 bg-orange-50 px-2 py-0.5 rounded-full">Override Active</span>}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 border-0 shadow-2xl">
                {/* Headerless-feel or branded header */}
                <div className="p-6 pb-0 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl">{reservation.customerName}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">{reservation.itemName}</DialogDescription>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">#{reservation.id.slice(0, 6)}</div>
                </div>

                <div className="p-6">
                    {fetchingItems ? (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading details...
                        </div>
                    ) : (
                        <StatusDisplay />
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 sm:justify-between items-center bg-gray-50/50 mt-2">
                    <div className="flex gap-2">
                        <PrintContractButton reservationId={reservation.id} label={t('operations.issueFlow.contract')} />
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>

                    <Button
                        onClick={handleConfirm}
                        disabled={(!isAllowed && !overrideMode) || loading || fetchingItems || autoAssigning}
                        className={cn(
                            "min-w-[120px] transition-all",
                            overrideMode ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                        autoFocus // Key for speed!
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <span className="flex items-center gap-2">Confirm <ArrowRight className="w-4 h-4" /></span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
