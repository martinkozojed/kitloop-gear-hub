
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Wrench, History, Info, Save, Edit, Plus } from 'lucide-react';
import { LogMaintenanceModal } from './LogMaintenanceModal';
import { supabase } from '@/lib/supabase';
import { InventoryAsset } from './InventoryGrid';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface AssetDetailSheetProps {
    assetId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    onEditProduct?: (productId: string) => void;
}

interface MaintenanceRecord {
    id: string;
    type: string;
    status: string | null;  // Can be null in database
    notes: string | null;
    created_at: string | null;  // Can be null in database
}

interface EventRecord {
    id: string;
    event_type: string;
    created_at: string;
    old_status: string | null;
    new_status: string | null;
}

export function AssetDetailSheet({ assetId, open, onOpenChange, onUpdate, onEditProduct }: AssetDetailSheetProps) {
    const [asset, setAsset] = useState<InventoryAsset | null>(null);
    const [history, setHistory] = useState<EventRecord[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit State
    const [editLocation, setEditLocation] = useState('');
    const [editCondition, setEditCondition] = useState('');

    // Maintenance Modal
    const [showLogMaintenance, setShowLogMaintenance] = useState(false);

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
          id, asset_tag, status, condition_score, location,
          product_variants ( name, sku, product_id, products ( name, image_url, category ) )
        `)
                .eq('id', id)
                .single();

            if (aErr) throw aErr;

            interface AssetRow {
                id: string;
                asset_tag: string;
                status: string;
                condition_score: number;
                location: string;
                product_variants: {
                    name: string;
                    sku: string | null;
                    product_id: string;
                    products: {
                        name: string;
                        image_url: string | null;
                        category: string;
                    } | null;
                } | null;
            }

            const row = aData as unknown as AssetRow;

            // Transform to shape
            setAsset({
                id: row.id,
                asset_tag: row.asset_tag,
                status: row.status as InventoryAsset['status'],
                condition_score: row.condition_score,
                location: row.location,
                variant: {
                    name: row.product_variants?.name || 'Unknown',
                    sku: row.product_variants?.sku || null,
                    product_id: row.product_variants?.product_id
                },
                product: {
                    name: row.product_variants?.products?.name || 'Unknown',
                    image_url: row.product_variants?.products?.image_url || null,
                    category: row.product_variants?.products?.category || 'Uncategorized'
                }
            });

            // Init Edit State
            setEditLocation(row.location || '');
            setEditCondition(row.condition_score?.toString() || '');
            setIsEditing(false);

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

        } catch (err: unknown) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAsset = async () => {
        if (!assetId) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('assets').update({
                location: editLocation,
                condition_score: parseInt(editCondition) || null
            }).eq('id', assetId);

            if (error) throw error;
            toast.success('Asset updated');
            setIsEditing(false);
            fetchDetails(assetId);
            if (onUpdate) onUpdate(); // Refresh parent grid
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Update failed', { description: message });
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
                            <SheetTitle className="text-xl flex items-center gap-2">
                                {asset?.product.name || 'Loading...'}
                                {onEditProduct && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => asset?.variant.product_id && onEditProduct(asset.variant.product_id)}>
                                        <Edit className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                )}
                            </SheetTitle>
                            <SheetDescription>
                                Tag: <span className="font-mono text-foreground font-medium">{asset?.asset_tag}</span>
                            </SheetDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2 items-center">
                        <Badge variant="outline">{asset?.variant.name}</Badge>
                        <Badge className={asset?.status === 'available' ? 'bg-green-600' : 'bg-gray-600'}>
                            {asset?.status}
                        </Badge>
                        <Badge variant="secondary">Health: {asset?.condition_score}%</Badge>
                        <div className="flex-1" />
                        {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                Edit Details
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleSaveAsset}>Save</Button>
                            </div>
                        )}
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
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground">Location</label>
                                        {isEditing ? (
                                            <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="h-8" />
                                        ) : (
                                            <div className="font-medium">{asset?.location || 'Unassigned'}</div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground">Category</label>
                                        <div className="font-medium capitalize">{asset?.product.category}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground">SKU (Variant)</label>
                                        <div className="font-medium font-mono">{asset?.variant.sku || '—'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-muted-foreground">Condition Score</label>
                                        {isEditing ? (
                                            <Input type="number" value={editCondition} onChange={e => setEditCondition(e.target.value)} className="h-8 w-20" />
                                        ) : (
                                            <div className="font-medium">{asset?.condition_score ? `${asset.condition_score}%` : 'N/A'}</div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
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
                                            <Button variant="ghost" className="mt-2 text-primary hover:text-primary/80" onClick={() => setShowLogMaintenance(true)}>
                                                Log Maintenance
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Button size="sm" variant="outline" className="w-full mb-4" onClick={() => setShowLogMaintenance(true)}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Log Entry
                                            </Button>
                                            {maintenance.map(m => (
                                                <div key={m.id} className="flex gap-3 border-b pb-3">
                                                    <div className="bg-orange-100 p-2 rounded-full h-fit">
                                                        <Wrench className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium capitalize">{m.type} - {m.status}</div>
                                                        <div className="text-sm text-muted-foreground">{m.notes}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {m.created_at ? format(new Date(m.created_at), 'PPP') : 'N/A'}
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

                {assetId && (
                    <LogMaintenanceModal
                        open={showLogMaintenance}
                        onOpenChange={setShowLogMaintenance}
                        assetIds={[assetId]}
                        onSuccess={() => fetchDetails(assetId)}
                    />
                )}
            </SheetContent>
        </Sheet>
    );
}

