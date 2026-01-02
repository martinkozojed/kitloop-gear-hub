
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PackageCheck, AlertOctagon, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { supabase } from "@/lib/supabase";
import { LogMaintenanceModal } from './LogMaintenanceModal';
import { useTranslation } from 'react-i18next';

interface ReturnFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, damageReported: boolean) => Promise<void>;
}

export function ReturnFlow({ open, onOpenChange, reservation, onConfirm }: ReturnFlowProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [hasDamage, setHasDamage] = useState(false);

    // Logic to open Maintenance Log
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [assetIds, setAssetIds] = useState<string[]>([]);

    useEffect(() => {
        if (open && reservation.id) {
            // Fetch asset IDs associated with this reservation (active)
            const fetchAssets = async () => {
                const { data } = await supabase
                    .from('reservation_assignments')
                    .select('asset_id')
                    .eq('reservation_id', reservation.id)
                    .is('returned_at', null);

                if (data) {
                    setAssetIds(data.map(d => d.asset_id));
                }
            };
            fetchAssets();
        }
    }, [open, reservation.id]);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(reservation.id, hasDamage);

            if (hasDamage && assetIds.length > 0) {
                // If damage reported, open the maintenance modal immediately
                setShowMaintenance(true);
                // Do NOT close the main dialog yet, let the maintenance modal handle it or close both?
                // Actually better UX: Close this, open maintenance.
                onOpenChange(false);
            } else {
                onOpenChange(false);
            }

            // Ensure status reflects return completion (defensive, RPC should handle)
            await supabase.from('reservations').update({ status: 'completed' }).eq('id', reservation.id);
        } catch (e) {
            console.error(e);
            toast.error(t('error', 'Failed to return reservation'));
        } finally {
            setLoading(false);
        }
    };

    // Shortcut: Cmd+Enter (or Ctrl+Enter) to confirm
    useKeyboardShortcut(
        { key: 'Enter', metaOrCtrl: true },
        () => {
            if (!loading && !showMaintenance) {
                handleConfirm();
            }
        },
        { enabled: open }
    );

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-blue-600" />
                            {t('operations.returnFlow.title', 'Return Reservation')} #{reservation.id.slice(0, 8)}
                        </DialogTitle>
                        <DialogDescription>
                            {reservation.customerName} - {reservation.itemName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-4">
                        <div className={`flex items-start space-x-3 p-4 border rounded-md transition-colors ${hasDamage ? 'bg-orange-50 border-orange-200' : 'bg-muted/20'}`}>
                            <Checkbox
                                id="damage"
                                checked={hasDamage}
                                onCheckedChange={(c) => setHasDamage(c as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label
                                    htmlFor="damage"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    {t('operations.returnFlow.damage.label', 'Report Damage / Issue')}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('operations.returnFlow.damage.hint', 'Check if gear requires maintenance, cleaning or is damaged.')}
                                </p>
                            </div>
                        </div>

                        {hasDamage && (
                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md flex items-center gap-2 animate-in fade-in">
                                <Wrench className="w-4 h-4" />
                                <span>{t('operations.returnFlow.damage.nextStep', 'You will be prompted to log maintenance details after confirmation.')}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-between">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={loading}
                            className={hasDamage ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}
                        >
                            {loading ? t('common.processing', 'Processing...') : (hasDamage ? t('operations.returnFlow.confirmDamage', 'Return & Log Issue') : t('operations.returnFlow.confirm', 'Complete Return'))}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <LogMaintenanceModal
                open={showMaintenance}
                onOpenChange={setShowMaintenance}
                assetIds={assetIds}
                onSuccess={() => toast.success(t('operations.maintenance.logged', 'Maintenance logged'))}
            />
        </>
    );
}
