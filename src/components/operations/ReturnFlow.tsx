import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { logEvent } from '@/lib/app-events';
import { ScannerModal } from './ScannerModal';

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
    const isMobile = useIsMobile();
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
            toast.error(t('error'));
        } finally {
            setFetching(false);
        }
    }, [reservation.id, t]);

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
                const { data: reportData, error: reportError } = await supabase.rpc('create_return_report', {
                    p_reservation_id: reservation.id,
                    p_provider_id: provider.id,
                    // p_user_id removed, derived from auth context
                    p_damage_reports: damagePayload,
                    p_general_notes: ''
                });

                if (reportError) {
                    // Idempotence Check
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
                        toast.error(t('operations.returnFlow.errors.tooLarge'), {
                            description: `${Math.round(damageRule.maxBytes / (1024 * 1024))} MB`,
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
                            toast.error(t('operations.returnFlow.errors.uploadFailed'), {
                                description: uploadError.reasonCode === "mime_not_allowed"
                                    ? t('operations.returnFlow.errors.uploadFailed')
                                    : uploadError.message,
                            });
                        }
                    }
                }
            }

            // 4. Attach Evidence to Report (Phase 2b)
            if (evidence.length > 0 && reportId) {
                const { error: attachError } = await supabase.rpc('attach_return_photos', {
                    p_report_id: reportId,
                    p_photo_evidence: evidence
                });

                if (attachError) {
                    console.error("Failed to attach photos", attachError);
                    toast.error(t('operations.returnFlow.errors.uploadFailed'));
                    throw attachError; // Trigger retry state
                }
            }

            if (uploadErrors > 0) {
                toast.warning(t('operations.returnFlow.errors.uploadFailed'));
                // Don't close dialog if uploads failed, let user retry
                return;
            } else {
                toast.success(t('operations.returnFlow.success'));
            }

            await logEvent('reservation_return', {
                providerId: provider.id,
                entity: { type: 'reservation', id: reservation.id },
                metadata: { has_damage: assets.some(a => a.isDamaged) },
            });
            await onConfirm(reservation.id, assets.some(a => a.isDamaged));
            onOpenChange(false);
            setSuccessfullyReturnedReportId(null); // Reset

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.error(e);
            toast.error(message || t('operations.returnFlow.errors.saveFailed'));
            // Do NOT close dialog on error, allowing retry
        } finally {
            setLoading(false);
        }
    };

    const hasAnyDamage = assets.some(a => a.isDamaged);

    const [scanning, setScanning] = useState(false);
    const [scannedAssetIds, setScannedAssetIds] = useState<Set<string>>(new Set());

    const handleScanAsset = (scannedCode: string) => {
        // Try to match by ID or Asset Tag
        const matchedAsset = assets.find(a => a.id === scannedCode || a.asset_tag === scannedCode);

        if (matchedAsset) {
            setScannedAssetIds(prev => {
                const newSet = new Set(prev);
                newSet.add(matchedAsset.id);
                return newSet;
            });
            toast.success(t('operations.returnFlow.scan.success', { defaultValue: `Vybavení ${matchedAsset.asset_tag} naskenováno a označeno jako vrácené.` }));

            // Auto check the checkbox if no damage? In MVP we still expect them to verify manual damage
            // For now, scanning it simply highlights the row.
        } else {
            toast.error(t('operations.returnFlow.scan.notFound', { defaultValue: 'Tento kus nepatří k této rezervaci nebo nebyl vydán.' }));
        }
    };

    const bodyContent = (
        <>
            <div className="py-4 space-y-6">
                <ScannerModal
                    open={scanning}
                    onOpenChange={setScanning}
                    onScan={handleScanAsset}
                    title={t('operations.returnFlow.scan.title', { defaultValue: 'Naskenovat vrácené vybavení' })}
                    description={t('operations.returnFlow.scan.desc', { defaultValue: 'Naskenujte kód na vraceném kusu.' })}
                />

                <div className="flex justify-between items-center bg-muted/50 p-4 rounded-token-lg border border-dashed border-border mb-4">
                    <div>
                        <h4 className="font-semibold text-sm">{t('operations.returnFlow.scan.promptTitle', { defaultValue: 'Rychlé vrácení' })}</h4>
                        <p className="text-xs text-muted-foreground">{t('operations.returnFlow.scan.promptDesc', { defaultValue: 'Naskenujte vybavení pro jeho rychlé odbavení.' })}</p>
                    </div>
                    <Button onClick={() => setScanning(true)} size="sm">
                        <Camera className="w-4 h-4 mr-2" />
                        {t('operations.returnFlow.scan.button', { defaultValue: 'Skenovat' })}
                    </Button>
                </div>

                {fetching ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        {assets.map(asset => {
                            const isScanned = scannedAssetIds.has(asset.id);
                            return (
                                <div key={asset.id} className={cn(
                                    "p-4 border rounded-token-lg transition-all",
                                    asset.isDamaged ? "border-status-warning/30 bg-status-warning/10" :
                                        isScanned ? "border-status-success/30 bg-status-success/10" : "border-border bg-muted"
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
                                                {t('operations.returnFlow.reportDamage')}
                                            </Label>
                                        </div>
                                    </div>

                                    {asset.isDamaged && (
                                        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">{t('operations.returnFlow.describeIssue')}</Label>
                                                <Textarea
                                                    placeholder={t('operations.returnFlow.describeIssue')}
                                                    className="h-20 text-xs bg-background"
                                                    value={asset.note}
                                                    onChange={(e) => updateNote(asset.id, e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">{t('operations.returnFlow.evidencePhoto')}</Label>
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
                                                        {asset.photoFile ? asset.photoFile.name : t('operations.returnFlow.uploadPhoto')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {hasAnyDamage && (
                    <div className="flex items-center gap-2 p-3 text-xs bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-token-md">
                        <AlertOctagon className="w-4 h-4" />
                        {t('operations.returnFlow.damageWarning')}
                    </div>
                )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
                    {t('operations.returnFlow.cancel')}
                </Button>
                <Button data-testid="return-confirm-btn" variant={hasAnyDamage ? "warning" : undefined} onClick={handleConfirm} disabled={loading || fetching} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (successfullyReturnedReportId ? t('operations.returnFlow.retry') : t('operations.returnFlow.complete'))}
                </Button>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-token-lg">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-status-success" />
                            {t('operations.returnFlow.title')}
                        </SheetTitle>
                        <SheetDescription>
                            {reservation.customerName} - {reservation.itemName}
                        </SheetDescription>
                    </SheetHeader>
                    {bodyContent}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-status-success" />
                        {t('operations.returnFlow.title')}
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
                            {assets.map(asset => {
                                const isScanned = scannedAssetIds.has(asset.id);
                                return (
                                    <div key={asset.id} className={cn(
                                        "p-4 border rounded-token-lg transition-all",
                                        asset.isDamaged ? "border-status-warning/30 bg-status-warning/10" :
                                            isScanned ? "border-status-success/30 bg-status-success/10" : "border-border bg-muted"
                                    )}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{asset.product_name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{asset.asset_tag}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`dmg-d-${asset.id}`}
                                                    checked={asset.isDamaged}
                                                    onCheckedChange={(c) => toggleDamage(asset.id, c as boolean)}
                                                />
                                                <Label htmlFor={`dmg-d-${asset.id}`} className="text-sm cursor-pointer">
                                                    {t('operations.returnFlow.reportDamage')}
                                                </Label>
                                            </div>
                                        </div>

                                        {asset.isDamaged && (
                                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('operations.returnFlow.describeIssue')}</Label>
                                                    <Textarea
                                                        placeholder={t('operations.returnFlow.describeIssue')}
                                                        className="h-20 text-xs bg-background"
                                                        value={asset.note}
                                                        onChange={(e) => updateNote(asset.id, e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">{t('operations.returnFlow.evidencePhoto')}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            id={`file-d-${asset.id}`}
                                                            onChange={(e) => handleFileChange(asset.id, e.target.files?.[0] || null)}
                                                        />
                                                        <Button variant="outline" size="sm" className="w-full h-9 border-dashed" onClick={() => document.getElementById(`file-d-${asset.id}`)?.click()}>
                                                            <Camera className="w-3 h-3 mr-2" />
                                                            {asset.photoFile ? asset.photoFile.name : t('operations.returnFlow.uploadPhoto')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {hasAnyDamage && (
                        <div className="flex items-center gap-2 p-3 text-xs bg-status-warning/10 text-status-warning border border-status-warning/20 rounded-token-md">
                            <AlertOctagon className="w-4 h-4" />
                            {t('operations.returnFlow.damageWarning')}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('operations.returnFlow.cancel')}
                    </Button>
                    <Button data-testid="return-confirm-btn" variant={hasAnyDamage ? "warning" : undefined} onClick={handleConfirm} disabled={loading || fetching}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (successfullyReturnedReportId ? t('operations.returnFlow.retry') : t('operations.returnFlow.complete'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
