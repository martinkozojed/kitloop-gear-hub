
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Wrench, History, Info, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InventoryAsset } from './InventoryGrid';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface AssetDetailSheetProps {
    assetId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

interface MaintenanceRecord {
    id: string;
    type: string;
    status: string;
    notes: string | null;
    created_at: string;
}

interface EventRecord {
    id: string;
    event_type: string;
    created_at: string;
    old_status: string | null;
    new_status: string | null;
}

export function AssetDetailSheet({ assetId, open, onOpenChange, onUpdate }: AssetDetailSheetProps) {
    const [asset, setAsset] = useState<InventoryAsset | null>(null);
    const [history, setHistory] = useState<EventRecord[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (assetId && open) {
            fetchDetails(assetId);
        }
    }, [assetId, open]);

    const fetchDetails = async (id: string) => {
        setLoading(true);
        try {
            // 1. Fetch Asset Basics (Re-fetch to ensure fresh data)
            const { data: aData, error: aErr } = await supabase
                .from('assets')
                .select(`
          id, asset_tag, status, condition_score, location,
          product_variants ( name, sku, products ( name, image_url, category ) )
        `)
                .eq('id', id)
                .single();

            if (aErr) throw aErr;

            const row = aData as any; // Bypass TS complex join typing

            // Transform to shape
            setAsset({
                id: row.id,
                asset_tag: row.asset_tag,
                status: row.status,
                condition_score: row.condition_score,
                location: row.location,
                variant: { name: row.product_variants.name, sku: row.product_variants.sku },
                product: {
                    name: row.product_variants.products.name,
                    image_url: row.product_variants.products.image_url,
                    category: row.product_variants.products.category
                }
            });

            // 2. Fetch History (Mocked somewhat if data checks fail, but let's try real)
            const { data: hData } = await supabase
                .from('asset_events')
                .select('*')
                .eq('asset_id', id)
                .order('created_at', { ascending: false })
                .limit(20);
            setHistory(hData || []);

            // 3. Fetch Maintenance
            const { data: mData } = await supabase
                .from('maintenance_log')
                .select('*')
                .eq('asset_id', id)
                .order('created_at', { ascending: false });
            setMaintenance(mData || []);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!assetId) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader>
                    <div className="flex items-center gap-4">
                        {asset?.product.image_url && (
                            <img src={asset.product.image_url} className="w-16 h-16 rounded object-cover border" />
                        )}
                        <div>
                            <SheetTitle className="text-xl">{asset?.product.name || 'Loading...'}</SheetTitle>
                            <SheetDescription>
                                Tag: <span className="font-mono text-foreground font-medium">{asset?.asset_tag}</span> • Limitless potential
                            </SheetDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{asset?.variant.name}</Badge>
                        <Badge className={asset?.status === 'available' ? 'bg-green-600' : 'bg-gray-600'}>
                            {asset?.status}
                        </Badge>
                        <Badge variant="secondary">Health: {asset?.condition_score}%</Badge>
                    </div>
                </SheetHeader>

                <div className="flex-1 mt-6">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Tabs defaultValue="details" className="h-full">
                            <TabsList className="w-full">
                                <TabsTrigger value="details" className="flex-1"><Info className="w-4 h-4 mr-2" /> Details</TabsTrigger>
                                <TabsTrigger value="maintenance" className="flex-1"><Wrench className="w-4 h-4 mr-2" /> Service</TabsTrigger>
                                <TabsTrigger value="history" className="flex-1"><History className="w-4 h-4 mr-2" /> History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-muted-foreground">Location</label>
                                        <div className="font-medium">{asset?.location || 'Unassigned'}</div>
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">Category</label>
                                        <div className="font-medium capitalize">{asset?.product.category}</div>
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">SKU (Variant)</label>
                                        <div className="font-medium font-mono">{asset?.variant.sku || '—'}</div>
                                    </div>
                                    <div>
                                        <label className="text-muted-foreground">System ID</label>
                                        <div className="font-mono text-xs text-muted-foreground truncate" title={asset?.id}>{asset?.id}</div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                                    <h4 className="font-semibold mb-1">Rental Tips</h4>
                                    <p>Check bindings before every rental. Ensure serial number matches user contract.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="maintenance" className="h-full">
                                <ScrollArea className="h-[400px]">
                                    {maintenance.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                            <p>No cleanings or repairs recorded.</p>
                                            <Button variant="ghost" className="mt-2 text-primary hover:text-primary/80">Log Maintenance</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {maintenance.map(m => (
                                                <div key={m.id} className="flex gap-3 border-b pb-3">
                                                    <div className="bg-orange-100 p-2 rounded-full h-fit">
                                                        <Wrench className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium capitalize">{m.type} - {m.status}</div>
                                                        <div className="text-sm text-muted-foreground">{m.notes}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {format(new Date(m.created_at), 'PPP')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="history" className="h-full">
                                <ScrollArea className="h-[400px]">
                                    {history.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <p>No events recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="border-l-2 border-muted ml-4 space-y-6 pl-4 pt-2">
                                            {history.map(h => (
                                                <div key={h.id} className="relative">
                                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-input border" />
                                                    <div className="font-medium text-sm">{h.event_type.replace('_', ' ')}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {h.old_status} → {h.new_status}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(h.created_at), 'PPP p')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
