
import React, { useState } from 'react';
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
import { PackageCheck, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

interface ReturnFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, damageReported: boolean) => Promise<void>;
}

export function ReturnFlow({ open, onOpenChange, reservation, onConfirm }: ReturnFlowProps) {
    const [loading, setLoading] = useState(false);
    const [hasDamage, setHasDamage] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(reservation.id, hasDamage);
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to return reservation");
        } finally {
            setLoading(false);
        }
    };

    // Shortcut: Cmd+Enter (or Ctrl+Enter) to confirm
    useKeyboardShortcut(
        { key: 'Enter', metaOrCtrl: true },
        () => {
            if (!loading) {
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
                        <PackageCheck className="w-5 h-5 text-blue-600" />
                        Return Reservation #{reservation.id}
                    </DialogTitle>
                    <DialogDescription>
                        {reservation.customerName} - {reservation.itemName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-md bg-muted/20">
                        <Checkbox
                            id="damage"
                            checked={hasDamage}
                            onCheckedChange={(c) => setHasDamage(c as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="damage"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Report Damage / Incident
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Check if gear is damaged or dirty beyond standard use.
                            </p>
                        </div>
                    </div>

                    {hasDamage && (
                        <div className="p-3 bg-red-50 text-red-800 text-xs rounded-md flex items-center gap-2">
                            <AlertOctagon className="w-4 h-4" />
                            This will flag the item for Inspection.
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={hasDamage ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}
                    >
                        {loading ? "Processing..." : (hasDamage ? "Submit for Inspection" : "Complete Return")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
