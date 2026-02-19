import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Search, Loader2, Package, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const maintenanceEnabled = import.meta.env.VITE_ENABLE_MAINTENANCE === 'true';

interface ScanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AssetResult {
    asset: {
        id: string;
        asset_tag: string;
        status: string;
        variant?: {
            name: string;
            product?: { name: string };
        };
    };
    activeAssignment?: {
        reservation_id: string;
        reservations?: { customer_name: string; status: string };
    } | null;
}

export function ScanDialog({ open, onOpenChange }: ScanDialogProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [tag, setTag] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AssetResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setTag('');
            setResult(null);
        }
    }, [open]);

    const handleScan = async (searchTag: string) => {
        if (!searchTag.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            // 1. Find Asset
            const { data: asset, error } = await supabase
                .from('assets')
                .select(`
            *,
            variant:product_variants ( name, product:products ( name ) )
        `)
                .eq('asset_tag', searchTag)
                .single();

            if (error || !asset) {
                toast.error(t('warehouse.scan.notFound', { tag: searchTag }));
                setLoading(false);
                return;
            }

            // 2. Find Active Context (Is it reserved? Is it rented?)
            // Check if currently assigned to an active reservation (picked up)
            const { data: activeAssignment } = await supabase
                .from('reservation_assignments')
                .select('reservation_id, reservations(customer_name, status)')
                .eq('asset_id', asset.id)
                .is('returned_at', null)
                .maybeSingle();

            setResult({
                asset: { ...asset, status: asset.status ?? 'active' },  // Ensure status is never null
                activeAssignment
            });

        } catch (e) {
            console.error(e);
            toast.error("Error scanning asset");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleScan(tag);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md top-[20%] translate-y-0">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        {t('warehouse.scan.title', 'Scan Asset')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('warehouse.scan.description', 'Enter asset tag or scan QR code')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 my-4">
                    <Input
                        ref={inputRef}
                        placeholder="Asset Tag (e.g. A-102)"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="text-lg font-mono uppercase"
                    />
                    <Button onClick={() => handleScan(tag)} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                </div>

                {result && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {/* Asset Card */}
                        <div className="p-4 border rounded-lg bg-slate-50 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-lg">{result.asset.variant?.product?.name}</h4>
                                    <p className="text-sm text-muted-foreground">{result.asset.variant?.name}</p>
                                </div>
                                <Badge variant={result.asset.status === 'active' ? 'secondary' : 'outline'}>
                                    {result.asset.status}
                                </Badge>
                            </div>
                            <div className="text-xs font-mono text-muted-foreground bg-white px-2 py-1 rounded inline-block border">
                                {result.asset.asset_tag}
                            </div>
                        </div>

                        {/* Context Actions */}
                        {result.activeAssignment ? (
                            <div className="p-4 border rounded-lg bg-blue-50 border-blue-100">
                                <h5 className="font-medium text-blue-900 mb-1">Currently Rented</h5>
                                <p className="text-sm text-blue-700 mb-3">
                                    Customer: <strong>{result.activeAssignment.reservations?.customer_name}</strong>
                                </p>
                                <Button
                                    className="w-full gap-2"
                                    variant="primary"
                                    onClick={() => {
                                        onOpenChange(false);
                                        navigate(`/provider/reservations/${result.activeAssignment!.reservation_id}?action=return`);
                                    }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Return Item
                                </Button>
                            </div>
                        ) : result.asset.status === 'maintenance' ? (
                            <div className="p-4 border rounded-lg bg-amber-50 border-amber-100">
                                <h5 className="font-medium text-amber-900 mb-1">In Maintenance</h5>
                                {maintenanceEnabled && (
                                    <Button
                                        className="w-full mt-2"
                                        variant="outline"
                                        onClick={() => {
                                            onOpenChange(false);
                                            navigate('/provider/maintenance');
                                        }}
                                    >
                                        View Work Order
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => {
                                        onOpenChange(false);
                                        navigate('/provider/inventory');
                                    }}
                                >
                                    <Package className="w-4 h-4" />
                                    View Detail
                                </Button>
                                <Button
                                    className="gap-2"
                                    onClick={() => {
                                        onOpenChange(false);
                                        navigate('/provider/reservations');
                                    }}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    Issue Item
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
