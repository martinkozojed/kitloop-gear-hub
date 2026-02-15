import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ResolveConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: {
        id: string;
        product_variant_id: string | null;
        start_date: string;
        end_date: string;
        customer_name: string;
    };
    onSuccess: () => void;
}

interface AssetCandidate {
    id: string;
    asset_tag: string;
    status: string;
    condition_score: number;
}

export function ResolveConflictModal({ isOpen, onClose, reservation, onSuccess }: ResolveConflictModalProps) {
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [candidates, setCandidates] = useState<AssetCandidate[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const fetchCandidates = React.useCallback(async () => {
        if (!reservation.product_variant_id) return;
        setLoading(true);
        try {
            // 1. Get all assets for this variant
            const { data: allAssets, error: assetError } = await supabase
                .from('assets')
                .select('id, asset_tag, status, condition_score')
                .eq('variant_id', reservation.product_variant_id);

            if (assetError) throw assetError;

            // 2. key check: Find overlapping assignments for these assets
            const { data: busyAssets, error: busyError } = await supabase
                .from('reservation_assignments')
                .select(`
                    asset_id,
                    reservations!inner (
                        start_date,
                        end_date,
                        status
                    )
                `)
                .neq('reservations.id', reservation.id) // Don't count self
                .in('reservations.status', ['confirmed', 'active'])
                .lt('reservations.start_date', reservation.end_date)
                .gt('reservations.end_date', reservation.start_date);

            if (busyError) throw busyError;

            const busyAssetIds = new Set((busyAssets as { asset_id: string }[]).map((a) => a.asset_id));

            // 3. Filter
            const available = allAssets.filter(a => !busyAssetIds.has(a.id));

            // Sort: Best condition first
            available.sort((a, b) => (b.condition_score || 0) - (a.condition_score || 0));

            // Map and cast safely
            // define strict type to match AssetCandidate
            setCandidates(available.map(a => ({
                id: a.id,
                asset_tag: a.asset_tag,
                status: (a.status || 'available') as string, // Cast to string to satisfy interface, simpler than exact enum matching for now or update interface
                condition_score: a.condition_score || 0
            })));

            if (available.length > 0) setSelectedAssetId(available[0].id);

        } catch (error) {
            console.error("Failed to fetch candidates", error);
            toast.error("Failed to load available assets");
        } finally {
            setLoading(false);
        }
    }, [reservation.product_variant_id, reservation.end_date, reservation.start_date, reservation.id]);

    useEffect(() => {
        if (isOpen && reservation) {
            fetchCandidates();
        }
    }, [isOpen, reservation, fetchCandidates]);

    const handleAssign = async () => {
        if (!selectedAssetId) return;
        setAssigning(true);
        try {
            // 1. Delete existing assignment for this reservation (Swap logic)
            // Or we could update. Delete + Insert is safer to avoid unique constraint issues if unique index is on (reservation_id, asset_id) vs just asset_id timestamps.
            // But we have a unique index on asset_id + overlapping time? 
            // Let's just DELETE for this reservation first.
            await supabase
                .from('reservation_assignments')
                .delete()
                .eq('reservation_id', reservation.id);

            // 2. Insert new
            const { error } = await supabase
                .from('reservation_assignments')
                .insert({
                    reservation_id: reservation.id,
                    asset_id: selectedAssetId,
                    assigned_at: new Date().toISOString()
                });

            if (error) throw error;

            toast.success("Asset assigned successfully");
            onSuccess();
            onClose();

        } catch (error) {
            console.error("Assign failed", error);
            toast.error("Failed to assign asset");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                        Resolve Conflict / Assign Asset
                    </DialogTitle>
                    <DialogDescription>
                        Select an available asset for <strong>{reservation.customer_name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : candidates.length === 0 ? (
                        <div className="text-center p-6 bg-red-50 rounded-md text-red-800">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="font-semibold">No available assets found!</p>
                            <p className="text-sm mt-1">All compatible items are booked for these dates.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-muted-foreground">Available Candidates ({candidates.length}):</div>
                            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {candidates.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => setSelectedAssetId(asset.id)}
                                        className={`p-3 border rounded-md cursor-pointer flex justify-between items-center transition-all ${selectedAssetId === asset.id
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                            : 'hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-sm">{asset.asset_tag}</span>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs h-5">{asset.status}</Badge>
                                                {asset.condition_score !== null && (
                                                    <span className={`text-xs flex items-center ${asset.condition_score < 70 ? 'text-amber-600' : 'text-green-600'}`}>
                                                        Condition: {asset.condition_score}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedAssetId === asset.id && (
                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleAssign}
                        disabled={!selectedAssetId || assigning || loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {assigning ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...</>
                        ) : (
                            "Confirm Assignment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
