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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ItemState } from "@/lib/logic/reservation-state";
import { AlertTriangle, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PrintContractButton } from '@/components/contracts/PrintContractButton';
import { useTranslation } from 'react-i18next';
import { logEvent } from '@/lib/app-events';

interface IssueFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, isOverride: boolean) => Promise<void>;
}

export function IssueFlow({ open, onOpenChange, reservation, onConfirm }: IssueFlowProps) {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
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
    const buildItems = useCallback((rows: AssetAssignment[]) => {
        return (rows || []).map((d) => ({
            id: d.asset_id,
            status: d.assets?.status as ItemState['status']
        })) as ItemState[];
    }, []);

    interface ReservationData {
        id: string;
        start_date: string;
        end_date: string;
        product_variant_id: string | null;
        provider_id: string | null;
    }

    const autoAssignAsset = useCallback(async (res: ReservationData) => {
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
    }, []);

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
    }, [open, reservation.id, t, buildItems, autoAssignAsset]);



    useEffect(() => {
        fetchReservation();
    }, [fetchReservation]);

    const hasAssets = items.length > 0;
    // Payments are out of scope for MVP (SSOT §4). The DB-level hard gate enforces asset
    // availability; payment status must not block the issue action in the UI.
    const isAllowed = !!reservationRecord && reservationRecord.status === 'confirmed' && hasAssets;

    const handleConfirm = async () => {
        if (!reservationRecord?.provider_id) return;
        setLoading(true);
        try {
            const userResult = await supabase.auth.getUser();
            const userId = userResult.data.user?.id;

            if (!userId) throw new Error("Not authenticated");

            // Strict RPC Call

            const { data, error } = await supabase.rpc('issue_reservation', {
                p_reservation_id: reservation.id,
                p_provider_id: reservationRecord.provider_id,
                p_user_id: userId,
                p_override: overrideMode,
                p_override_reason: overrideMode ? 'Manual override by provider' : undefined
            });

            if (error) throw error;

            await logEvent('reservation_issue', {
                providerId: reservationRecord.provider_id,
                entity: { type: 'reservation', id: reservation.id },
                metadata: { override: overrideMode },
            });
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
                <div data-testid="issue-no-assets-warning" className="flex flex-col items-center justify-center p-6 text-center bg-status-warning/10 text-status-warning rounded-token-lg border border-status-warning/20 animate-in fade-in zoom-in duration-300">
                    <AlertTriangle className="w-8 h-8 mb-2 opacity-80" />
                    <h4 className="font-semibold">{t('operations.issueFlow.noAssets.title')}</h4>
                    <p className="text-sm opacity-80 mt-1 max-w-[250px]">{t('operations.issueFlow.noAssets.desc')}</p>
                    {autoAssigning && <div className="mt-2 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Finding asset...</div>}
                    {autoAssignError && <p className="mt-1 text-xs font-bold text-destructive">{autoAssignError}</p>}
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-status-success/10 text-status-success rounded-token-lg border border-status-success/20 animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 bg-status-success/20 rounded-full flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-status-success" />
                </div>
                <h4 className="text-lg font-bold text-foreground">Ready to Issue</h4>
                <p className="text-sm text-muted-foreground mt-1">Everything looks correct.</p>
                {overrideMode && <span className="text-status-warning bg-status-warning/10 mt-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">Override Active</span>}
            </div>
        );
    };

    const headerBlock = (
        <div className="p-6 pb-0 flex items-center justify-between">
            <div>
                <span className="text-xl font-semibold leading-none tracking-tight">{reservation.customerName}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{reservation.itemName}</p>
            </div>
            <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">#{reservation.id.slice(0, 6)}</div>
        </div>
    );
    const bodyBlock = (
        <div className="p-6">
            {fetchingItems ? (
                <div data-testid="issue-loading" className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading details...
                </div>
            ) : (
                <StatusDisplay />
            )}
        </div>
    );
    const footerBlock = (
        <div className="p-6 pt-0 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 bg-muted mt-2 -mx-6 -mb-6 p-6">
            <div className="flex flex-wrap gap-2">
                <PrintContractButton reservationId={reservation.id} label={t('operations.issueFlow.contract')} />
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
            </div>
            <Button
                data-testid="issue-confirm-btn"
                variant={overrideMode ? "warning" : "success"}
                onClick={handleConfirm}
                disabled={(!isAllowed && !overrideMode) || loading || fetchingItems || autoAssigning}
                className="min-w-[120px]"
                autoFocus
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <span className="flex items-center gap-2">Confirm <ArrowRight className="w-4 h-4" /></span>
                )}
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-token-lg p-0 gap-0 border-0">
                    {headerBlock}
                    {bodyBlock}
                    {footerBlock}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
                <div className="flex items-center justify-between px-6 pt-6">
                    <div>
                        <DialogTitle className="text-xl">{reservation.customerName}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">{reservation.itemName}</DialogDescription>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">#{reservation.id.slice(0, 6)}</div>
                </div>
                {bodyBlock}
                <DialogFooter className="p-6 pt-0 sm:justify-between items-center bg-muted mt-2">
                    <div className="flex gap-2">
                        <PrintContractButton reservationId={reservation.id} label={t('operations.issueFlow.contract')} />
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>
                    <Button
                        data-testid="issue-confirm-btn"
                        variant={overrideMode ? "warning" : "success"}
                        onClick={handleConfirm}
                        disabled={(!isAllowed && !overrideMode) || loading || fetchingItems || autoAssigning}
                        className="min-w-[120px]"
                        autoFocus
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
