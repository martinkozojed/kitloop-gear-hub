
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScannerModal } from './ScannerModal';
import { supabase } from '@/lib/supabase';
import { Loader2, Scan, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface HandoverModalProps {
    reservationId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type Assignment = {
    id: string;
    asset_id: string;
    asset_tag: string;
    variant_name: string;
    product_name: string;
    assigned_at: string;
    returned_at: string | null;
};

type ReservationState = {
    status: string;
    user_id: string;
    product_variants: {
        id: string;
        name: string;
        product: { name: string };
    } | null;
};

export function HandoverModal({ reservationId, open, onOpenChange, onSuccess }: HandoverModalProps) {
    const [loading, setLoading] = useState(false);
    const [reservation, setReservation] = useState<ReservationState | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualInput, setManualInput] = useState('');

    useEffect(() => {
        if (open && reservationId) {
            fetchData();
        }
    }, [open, reservationId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Reservation Details
            const { data: res, error: resError } = await supabase
                .from('reservations')
                .select(`
                    *,
                    product_variants(id, name, product:products(name))
                `)
                .eq('id', reservationId)
                .single();

            interface ReservationImpl {
                status: string;
                product_variants: {
                    id: string;
                    name: string;
                    product: { name: string };
                } | null;
                user_id: string; // Add other needed fields
            }
            if (resError) throw resError;
            // The result of .single() is one object, not array
            setReservation(res as unknown as ReservationImpl);

            // 2. Fetch Assignments
            const { data: asm, error: asmError } = await supabase
                .from('reservation_assignments')
                .select(`
                    *,
                    asset:assets(asset_tag, variant:product_variants(name, product:products(name)))
                `)
                .eq('reservation_id', reservationId);

            if (asmError) throw asmError;

            interface AssignmentRow {
                id: string;
                asset_id: string;
                assigned_at: string;
                returned_at: string | null;
                asset: {
                    asset_tag: string;
                    variant: {
                        name: string;
                        product: { name: string };
                    };
                };
            }

            // Map to cleaner structure
            const mapped = (asm as unknown as AssignmentRow[]).map((a) => ({
                id: a.id,
                asset_id: a.asset_id,
                asset_tag: a.asset.asset_tag,
                variant_name: a.asset.variant.name,
                product_name: a.asset.variant.product.name,
                assigned_at: a.assigned_at,
                returned_at: a.returned_at
            }));
            setAssignments(mapped);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Fetch error:', message);
            toast.error('Failed to load reservation details.');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (code: string) => {
        // Determine Mode
        const mode = reservation?.status === 'active' ? 'check-in' : 'check-out';

        try {
            // 1. Find Asset
            const { data: asset, error: assetError } = await supabase
                .from('assets')
                .select('id, status, asset_tag, variant_id')
                .eq('asset_tag', code) // Assuming code == asset_tag for now
                .single();

            if (assetError || !asset) {
                toast.error(`Asset ${code} not found.`);
                return;
            }

            if (mode === 'check-out') {
                // VALIDATE: Does asset match reserved variant?
                // Logic: if reservation has specific variant requirement
                // Note: reservation.product_variant_id might be null if legacy
                // Check if already assigned
                if (assignments.find(a => a.asset_tag === code)) {
                    toast.warning('Already scanned.');
                    return;
                }

                // Insert Assignment
                const { error: insertError } = await supabase.from('reservation_assignments').insert({
                    reservation_id: reservationId,
                    asset_id: asset.id,
                    condition_out_score: 100, // Default good
                });

                if (insertError) throw insertError;

                // Update Asset Status
                await supabase.from('assets').update({ status: 'active' }).eq('id', asset.id);

                toast.success(`Scanned ${code} for Check-out`);
            } else {
                // Check-in
                // Find existing assignment
                const assignment = assignments.find(a => a.asset_tag === code && !a.returned_at);
                if (!assignment) {
                    toast.error(`Asset ${code} not currently assigned to this reservation.`);
                    return;
                }

                // Update Assignment
                const { error: updateError } = await supabase
                    .from('reservation_assignments')
                    .update({ returned_at: new Date().toISOString() })
                    .eq('id', assignment.id);

                if (updateError) throw updateError;

                // Update Asset Status
                await supabase.from('assets').update({ status: 'available' }).eq('id', asset.id);

                toast.success(`Scanned ${code} for Check-in`);
            }

            // Refresh
            fetchData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error(err);
            toast.error('Operation failed: ' + message);
        }
    };

    const handleComplete = async () => {
        // Transition Reservation Status
        const mode = reservation?.status === 'active' ? 'check-in' : 'check-out';
        try {
            if (mode === 'check-out') {
                await supabase.from('reservations').update({ status: 'active' }).eq('id', reservationId);
                toast.success('Reservation Active!');
            } else {
                await supabase.from('reservations').update({ status: 'completed' }).eq('id', reservationId);
                toast.success('Reservation Completed!');
            }
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    if (!reservation) return null;

    const mode = reservation.status === 'active' ? 'Check-In' : 'Check-Out';
    const isComplete = reservation.status === 'completed' || reservation.status === 'cancelled';

    // Calculate progress
    // Assume 1 item per reservation for MVP? Or check assignments.length?
    // reservation table doesn't strictly have quantity column visible here easily if joined, usually quantity=1 for now?
    // Let's assume unlimited scanning allowed.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === 'Check-In' ? <ArrowRight className="rotate-180 text-orange-500" /> : <ArrowRight className="text-green-500" />}
                        {mode} Items
                        <Badge variant="outline" className="ml-2">{reservation.status}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                        <div>
                            <p className="text-muted-foreground">Product</p>
                            <p className="font-medium">{reservation.product_variants?.product?.name} ({reservation.product_variants?.name})</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Customer</p>
                            {/* Assuming user_id join or simple display */}
                            <p className="font-medium">User ID: {reservation.user_id?.substring(0, 8)}...</p>
                        </div>
                    </div>

                    {/* Scanner Actions */}
                    {!isComplete && (
                        <div className="flex gap-2">
                            <Button className="flex-1 h-20 text-lg" onClick={() => setScannerOpen(true)}>
                                <Scan className="mr-2 h-6 w-6" /> Scan Item
                            </Button>
                            <div className="flex flex-col gap-2 w-1/3">
                                <Input
                                    placeholder="Enter Tag..."
                                    value={manualInput}
                                    onChange={e => setManualInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            handleScan(manualInput);
                                            setManualInput('');
                                        }
                                    }}
                                />
                                <Button variant="secondary" onClick={() => { handleScan(manualInput); setManualInput(''); }}>Manual</Button>
                            </div>
                        </div>
                    )}

                    {/* Scanned Items List */}
                    <div className="border rounded-md">
                        <div className="bg-muted p-2 font-medium text-xs uppercase tracking-wider flex justify-between">
                            <span>Assigned Assets</span>
                            <span>{assignments.length} items</span>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            {assignments.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">No items scanned yet.</div>
                            ) : (
                                <div className="divide-y">
                                    {assignments.map(a => (
                                        <div key={a.id} className="p-3 flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                {a.returned_at ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Loader2 className="h-4 w-4 text-blue-500 animate-spin-slow" />}
                                                <div>
                                                    <p className="font-medium">{a.asset_tag}</p>
                                                    <p className="text-xs text-muted-foreground">{a.product_name} - {a.variant_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <p className="text-muted-foreground">{new Date(a.assigned_at).toLocaleTimeString()}</p>
                                                {a.returned_at && <p className="text-green-600">Returned {new Date(a.returned_at).toLocaleTimeString()}</p>}

                                                {/* Allow removal if accidentally scanned out and not returned yet? */}
                                                {!a.returned_at && mode === 'Check-Out' && (
                                                    <Button variant="ghost" size="sm" className="h-6 text-red-500 opacity-0 group-hover:opacity-100"
                                                        onClick={() => {
                                                            // TODO: Implement removal
                                                            toast.info('Removal not impl yet');
                                                        }}
                                                    >Remove</Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    {!isComplete && (
                        <Button onClick={handleComplete} disabled={assignments.length === 0}>
                            Complete {mode}
                        </Button>
                    )}
                </DialogFooter>

                <ScannerModal
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onScan={handleScan}
                />
            </DialogContent>
        </Dialog>
    );
}
