import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { mapRpcError } from "@/lib/rpcErrors";
import { requestUploadTicket, uploadWithTicket, UploadTicketError } from "@/lib/upload/client";
import { rulesForUseCase } from "@/lib/upload/validation";

interface IssueModalProps {
    open: boolean;
    onClose: () => void;
    reservationId: string;
    providerId: string;
    onSuccess: () => void;
}

export const IssueModal: React.FC<IssueModalProps> = ({ open, onClose, reservationId, providerId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [overrideMode, setOverrideMode] = useState(false);
    const [overrideReason, setOverrideReason] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleIssue = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { error } = await supabase.rpc('issue_reservation', {
                p_reservation_id: reservationId,
                p_provider_id: providerId,
                p_user_id: user.id,
                p_override: overrideMode,
                p_override_reason: overrideMode ? overrideReason : null
            });

            if (error) throw error;

            toast.success('Rezervace úspěšně vydána');
            onSuccess();
            onClose();
        } catch (error: unknown) {
            const mapped = mapRpcError(error);

            if (mapped.code === 'P0003') { // Payment Required
                setOverrideMode(true);
                setErrorMsg(mapped.message + ' ' + (mapped.hint || ''));
            } else {
                setErrorMsg(mapped.message);
                toast.error(mapped.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vydat Rezervaci</DialogTitle>
                    <DialogDescription>Potvrďte vydání vybavení zákazníkovi.</DialogDescription>
                </DialogHeader>

                {errorMsg && (
                    <div className="bg-red-50 text-red-800 p-3 rounded text-sm flex gap-2 items-center">
                        <AlertTriangle className="w-4 h-4" />
                        {errorMsg}
                    </div>
                )}

                {overrideMode && (
                    <div className="space-y-4 border-l-4 border-yellow-400 pl-4 bg-yellow-50 p-4 rounded-r">
                        <h4 className="font-bold text-yellow-800 text-sm">Vynutit vydání (Override)</h4>
                        <p className="text-xs text-yellow-700">Rezervace není zaplacena. Pro vydání zadejte důvod.</p>
                        <div className="space-y-2">
                            <Label>Důvod (min 3 znaky)</Label>
                            <Input
                                value={overrideReason}
                                onChange={e => setOverrideReason(e.target.value)}
                                placeholder="Např. Platba v hotovosti na místě"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Zrušit</Button>
                    <Button onClick={handleIssue} disabled={loading || (overrideMode && overrideReason.length < 3)}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {overrideMode ? 'Vydat (Override)' : 'Potvrdit Vydání'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface AssetAssignment {
    id: string;
    asset_id: string;
    asset: {
        asset_tag: string;
        product_variants: {
            name: string;
        } | null;
    } | null;
}

interface ReturnModalProps {
    open: boolean;
    onClose: () => void;
    reservationId: string;
    providerId: string;
    onSuccess: () => void;
    assets: AssetAssignment[];
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ open, onClose, reservationId, providerId, onSuccess, assets }) => {
    const [loading, setLoading] = useState(false);
    const [damageMap, setDamageMap] = useState<Record<string, boolean>>({}); // asset_id -> isDamaged
    const [notes, setNotes] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    const toggleDamage = (assetId: string) => {
        setDamageMap(prev => ({ ...prev, [assetId]: !prev[assetId] }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleReturn = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // 1. Upload Photos
            const photoPaths: string[] = [];
            if (files.length > 0) {
                setUploading(true);
                const damageRule = rulesForUseCase("damage_photo");
                for (const file of files) {
                    if (damageRule && file.size > damageRule.maxBytes) {
                        toast.error(`Soubor ${file.name} je příliš velký`, {
                            description: `Maximální velikost je ${Math.round(damageRule.maxBytes / (1024 * 1024))} MB.`
                        });
                        continue;
                    }

                    const ticket = await requestUploadTicket({
                        useCase: "damage_photo",
                        fileName: file.name,
                        mimeType: file.type || "application/octet-stream",
                        sizeBytes: file.size,
                        providerId,
                        reservationId,
                    });

                    await uploadWithTicket(ticket, file);
                    photoPaths.push(ticket.path);
                }
            }

            // 2. Build Damage Report
            const damageReports = assets.map(a => ({
                asset_id: a.asset_id,
                damaged: !!damageMap[a.asset_id],
                note: '' // Per-asset note not in MVP UI
            }));

            // 3. Call RPC
            const { error } = await supabase.rpc('process_return', {
                p_reservation_id: reservationId,
                p_provider_id: providerId,
                p_user_id: user.id,
                p_damage_reports: damageReports,
                p_photo_paths: photoPaths,
                p_general_notes: notes
            });

            if (error) throw error;

            toast.success('Vybavení úspěšně vráceno');
            onSuccess();
            onClose();

        } catch (error: unknown) {
            if (error instanceof UploadTicketError) {
                toast.error('Nahrání fotodokumentace selhalo', {
                    description: error.message
                });
            } else {
                const mapped = mapRpcError(error);
                toast.error(mapped.message);
            }
            console.error(error);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Vrátit Vybavení</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded border">
                        <h4 className="font-semibold mb-2 text-sm">Seznam vybavení</h4>
                        <ul className="space-y-2">
                            {assets.map((assignment) => (
                                <li key={assignment.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                    <span>
                                        <span className="font-bold">{assignment.asset?.asset_tag || 'N/A'}</span>
                                        <span className="text-gray-500 ml-2">
                                            ({assignment.asset?.product_variants?.name || 'Item'})
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`damage-${assignment.asset_id}`} className="text-xs">
                                            {damageMap[assignment.asset_id] ? <span className="text-red-600 font-bold">POŠKOZENO</span> : "OK"}
                                        </Label>
                                        <Checkbox
                                            id={`damage-${assignment.asset_id}`}
                                            checked={!!damageMap[assignment.asset_id]}
                                            onCheckedChange={() => toggleDamage(assignment.asset_id)}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label>Poznámka / Závady</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Popište stav při vrácení..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Fotodokumentace</Label>
                        <Input type="file" multiple accept="image/*" onChange={handleFileSelect} />
                        {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} souborů vybráno</p>}
                    </div>

                    {uploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Nahrávám fotografie...
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Zrušit</Button>
                    <Button onClick={handleReturn} disabled={loading || uploading}>
                        {(loading || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Potvrdit Vrácení
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
