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
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck, AlertOctagon, Upload, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { requestUploadTicket, uploadWithTicket, UploadTicketError } from "@/lib/upload/client";
import { rulesForUseCase } from "@/lib/upload/validation";

interface ReturnFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: { id: string; customerName: string; itemName: string };
    onConfirm: (id: string, damageReported: boolean) => Promise<void>; // Kept for signature compatibility but logic moves inside
}

interface AssetReturnState {
    id: string;
    asset_tag: string;
    product_name: string;
    isDamaged: boolean;
    note: string;
    photoFile: File | null;
}

export function ReturnFlow({ open, onOpenChange, reservation, onConfirm }: ReturnFlowProps) {
    const { t } = useTranslation();
    const { user, provider } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const [assets, setAssets] = useState<AssetReturnState[]>([]);

    const fetchAssets = React.useCallback(async () => {
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('reservation_assignments')
                .select(`
                    asset_id,
                    assets (
                        id, asset_tag,
                        product_variants (
                            products ( name )
                        )
                    )
                `)
                .eq('reservation_id', reservation.id)
                .is('returned_at', null);

            if (error) throw error;

            interface AssetAssignmentRow {
                asset_id: string;
                assets: {
                    id: string;
                    asset_tag: string;
                    product_variants: {
                        products: { name: string } | null;
                    } | null;
                } | null;
            }

            const mapped: AssetReturnState[] = (data as unknown as AssetAssignmentRow[] || []).map((item) => ({
                id: item.asset_id,
                asset_tag: item.assets?.asset_tag || 'Unknown',
                product_name: item.assets?.product_variants?.products?.name || 'Item',
                isDamaged: false,
                note: '',
                photoFile: null
            }));
            setAssets(mapped);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load assets");
        } finally {
            setFetching(false);
        }
    }, [reservation.id]);

    useEffect(() => {
        if (open && reservation.id) {
            fetchAssets();
        }
    }, [open, reservation.id, fetchAssets]);

    const handleFileChange = (assetId: string, file: File | null) => {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, photoFile: file } : a));
    };

    const toggleDamage = (assetId: string, checked: boolean) => {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isDamaged: checked } : a));
    };

    const updateNote = (assetId: string, note: string) => {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, note } : a));
    };

    const [successfullyReturnedReportId, setSuccessfullyReturnedReportId] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!user || !provider) return;
        setLoading(true);

        try {
            let reportId = successfullyReturnedReportId;

            if (!reportId) {
                // 1. Prepare Damage Payload
                const damagePayload = assets.map(a => ({
                    asset_id: a.id,
                    damaged: a.isDamaged,
                    note: a.note || ''
                }));

                // 2. Create Report (Phase 1 - Transactional)
                // @ts-expect-error - RPC types update pending
                const { data: reportData, error: reportError } = await supabase.rpc('create_return_report', {
                    p_reservation_id: reservation.id,
                    p_provider_id: provider.id,
                    // p_user_id removed, derived from auth context
                    p_damage_reports: damagePayload,
                    p_general_notes: ''
                });

                if (reportError) {
                    // Idempotence Check
                    // @ts-expect-error - Error code typing
                    if (reportError.code === 'P0003') {
                        toast.info(t('operations.returnFlow.alreadyReturned', 'Reservation already returned'));
                        await onConfirm(reservation.id, assets.some(a => a.isDamaged));
                        onOpenChange(false);
                        return;
                    }
                    throw reportError;
                }

                reportId = (reportData as { report_id: string })?.report_id;
                setSuccessfullyReturnedReportId(reportId);
            }

            // 3. Upload Photos (Phase 2a)
            const evidence = [];
            let uploadErrors = 0;
            const damageRule = rulesForUseCase("damage_photo");

            for (const asset of assets) {
                if (asset.isDamaged && asset.photoFile && reportId) {
                    if (damageRule && asset.photoFile.size > damageRule.maxBytes) {
                        uploadErrors++;
                        toast.error("Soubor je příliš velký", {
                            description: `Maximální velikost je ${Math.round(damageRule.maxBytes / (1024 * 1024))} MB.`,
                        });
                        continue;
                    }

                    try {
                        const ticket = await requestUploadTicket({
                            useCase: "damage_photo",
                            fileName: asset.photoFile.name,
                            mimeType: asset.photoFile.type || "application/octet-stream",
                            sizeBytes: asset.photoFile.size,
                            providerId: provider.id,
                            reservationId: reservation.id,
                        });

                        await uploadWithTicket(ticket, asset.photoFile);

                        evidence.push({
                            asset_id: asset.id,
                            path: ticket.path,
                            note: asset.note
                        });
                    } catch (uploadError) {
                        console.error("Upload failed", uploadError);
                        uploadErrors++;

                        if (uploadError instanceof UploadTicketError) {
                            toast.error("Nahrání fotky selhalo", {
                                description: uploadError.reasonCode === "mime_not_allowed"
                                    ? "Formát souboru není povolen."
                                    : uploadError.message,
                            });
                        }
                    }
                }
            }

            // 4. Attach Evidence to Report (Phase 2b)
            if (evidence.length > 0 && reportId) {
                // @ts-expect-error - RPC update pending
                const { error: attachError } = await supabase.rpc('attach_return_photos', {
                    p_report_id: reportId,
                    p_photo_evidence: evidence
                });

                if (attachError) {
                    console.error("Failed to attach photos", attachError);
                    toast.error("Return saved, but photo attachment failed. Please retry.");
                    throw attachError; // Trigger retry state
                }
            }

            if (uploadErrors > 0) {
                toast.warning(`Return processed but ${uploadErrors} photo(s) failed to upload. Please retry.`);
                // Don't close dialog if uploads failed, let user retry
                return;
            } else {
                toast.success(t('operations.returnFlow.success', 'Return processed successfully'));
            }

            await onConfirm(reservation.id, assets.some(a => a.isDamaged));
            onOpenChange(false);
            setSuccessfullyReturnedReportId(null); // Reset

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.error(e);
            toast.error(message || "Failed to process return");
            // Do NOT close dialog on error, allowing retry
        } finally {
            setLoading(false);
        }
    };

    const hasAnyDamage = assets.some(a => a.isDamaged);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-blue-600" />
                        {t('operations.returnFlow.title', 'Return Reservation')}
                    </DialogTitle>
                    <DialogDescription>
                        {reservation.customerName} - {reservation.itemName}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {fetching ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-4">
                            {assets.map(asset => (
                                <div key={asset.id} className={cn(
                                    "p-4 border rounded-lg transition-all",
                                    asset.isDamaged ? "border-orange-200 bg-orange-50/50" : "border-slate-100 bg-slate-50/50"
                                )}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{asset.product_name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{asset.asset_tag}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`dmg-${asset.id}`}
                                                checked={asset.isDamaged}
                                                onCheckedChange={(c) => toggleDamage(asset.id, c as boolean)}
                                            />
                                            <Label htmlFor={`dmg-${asset.id}`} className="text-sm cursor-pointer">
                                                Report Damage
                                            </Label>
                                        </div>
                                    </div>

                                    {asset.isDamaged && (
                                        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Describe Issue</Label>
                                                <Textarea
                                                    placeholder="What is damaged?"
                                                    className="h-20 text-xs bg-white"
                                                    value={asset.note}
                                                    onChange={(e) => updateNote(asset.id, e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">Evidence Photo</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        id={`file-${asset.id}`}
                                                        onChange={(e) => handleFileChange(asset.id, e.target.files?.[0] || null)}
                                                    />
                                                    <Button variant="outline" size="sm" className="w-full h-9 border-dashed" onClick={() => document.getElementById(`file-${asset.id}`)?.click()}>
                                                        <Camera className="w-3 h-3 mr-2" />
                                                        {asset.photoFile ? asset.photoFile.name : "Upload Photo"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {hasAnyDamage && (
                        <div className="flex items-center gap-2 p-3 text-xs text-orange-800 bg-orange-100 rounded-md">
                            <AlertOctagon className="w-4 h-4" />
                            Items marked as damaged will be set to 'Maintenance' status.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading || fetching} className={hasAnyDamage ? "bg-orange-600 hover:bg-orange-700" : ""}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (successfullyReturnedReportId ? "Retry Upload" : "Complete Return")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
