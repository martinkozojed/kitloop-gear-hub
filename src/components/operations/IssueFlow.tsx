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

import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface IssueFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: ReservationState & { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, isOverride: boolean) => Promise<void>;
}

export function IssueFlow({ open, onOpenChange, reservation, onConfirm }: IssueFlowProps) {
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
            toast.error("Failed to issue reservation");
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
                        Issue Reservation #{reservation.id}
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
                                No Assets Assigned
                            </div>
                            <p className="text-sm">
                                This reservation has no specific items assigned yet.
                                Please assign assets in the calendar before issuing.
                            </p>
                        </div>
                    ) : !isAllowed && !overrideMode ? (
                        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                Action Blocked
                            </div>
                            <p className="text-sm">
                                This reservation is <strong>{reservation.paymentStatus}</strong>.
                                You cannot issue items until payment is settled.
                            </p>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => setOverrideMode(true)}
                            >
                                Admin Override (Log Event)
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
                                Ready for issue. ID Check passed?
                            </div>

                            {overrideMode && (
                                <p className="text-xs text-orange-600 font-medium text-center">
                                    ⚠️ Override Active - This action will be logged.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={(!isAllowed && !overrideMode) || loading}
                        className={overrideMode ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}
                    >
                        {loading ? "Processing..." : "Confirm Issue"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
