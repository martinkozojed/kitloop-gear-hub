
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Box, ArrowRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface AssetFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// Minimal types for selection
type ProductOption = {
    id: string;
    name: string;
    image_url: string | null;
    variants: { id: string; name: string }[];
};

export function AssetForm({ open, onOpenChange, onSuccess }: AssetFormProps) {
    const { provider } = useAuth();
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductOption[]>([]);

    // Step 1: Selection
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');

    // Step 2: Configuration
    const [quantity, setQuantity] = useState(1);
    const [tagPrefix, setTagPrefix] = useState('TAG-');
    const [startNumber, setStartNumber] = useState(1);
    const [location, setLocation] = useState('Warehouse A');

    // Fetch products on open
    useEffect(() => {
        if (open && provider?.id) {
            fetchProducts();
        }
    }, [open, provider?.id]);

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, image_url, items:product_variants(id, name)')
            .eq('provider_id', provider!.id);

        if (data) {
            // transform for easier usage
            const opts = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                image_url: p.image_url,
                variants: p.items
            }));
            setProducts(opts);
        }
    };

    const handleSubmit = async () => {
        if (!selectedVariantId) return;
        setLoading(true);

        try {
            const assetsToCreate = Array.from({ length: quantity }).map((_, i) => {
                const num = startNumber + i;
                const padded = num.toString().padStart(3, '0');
                return {
                    provider_id: provider!.id,
                    variant_id: selectedVariantId,
                    asset_tag: `${tagPrefix}${padded}`,
                    status: 'available',
                    location,
                    condition_score: 100
                };
            });

            const { error } = await supabase.from('assets').insert(assetsToCreate as any);
            if (error) throw error;

            toast.success(`Successfully added ${quantity} assets!`);
            onSuccess();
            onOpenChange(false);
            // Reset
            setStep(1);
            setQuantity(1);

        } catch (err: any) {
            toast.error('Failed to create assets', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Inventory Assets</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Product</Label>
                                <Select value={selectedProductId} onValueChange={(val) => { setSelectedProductId(val); setSelectedVariantId(''); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedProduct && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Select Size / Variant</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedProduct.variants.map(v => (
                                            <div
                                                key={v.id}
                                                onClick={() => setSelectedVariantId(v.id)}
                                                className={`cursor-pointer border rounded-md p-3 text-center text-sm font-medium transition-colors ${selectedVariantId === v.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                                            >
                                                {v.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                                {selectedProduct?.image_url ? (
                                    <img src={selectedProduct.image_url} className="w-12 h-12 rounded object-cover" />
                                ) : <Box className="w-10 h-10 text-muted-foreground" />}
                                <div>
                                    <div className="font-semibold">{selectedProduct?.name}</div>
                                    <Badge variant="outline">{selectedProduct?.variants.find(v => v.id === selectedVariantId)?.name}</Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Starting Number</Label>
                                    <Input type="number" value={startNumber} onChange={e => setStartNumber(parseInt(e.target.value) || 1)} />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Tag Prefix</Label>
                                    <Input value={tagPrefix} onChange={e => setTagPrefix(e.target.value)} placeholder="SKI-24-" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Preview: <span className="font-mono bg-muted px-1">{tagPrefix}{(startNumber).toString().padStart(3, '0')}</span> ... <span className="font-mono bg-muted px-1">{tagPrefix}{(startNumber + quantity - 1).toString().padStart(3, '0')}</span>
                                    </p>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Location</Label>
                                    <Input value={location} onChange={e => setLocation(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => setStep(1)} className="mr-auto">Back</Button>
                    )}
                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!selectedVariantId}>
                            Next <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                            Create {quantity} Assets
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
