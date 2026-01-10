
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GEAR_CATEGORIES } from '@/lib/categories';
import { Plus, Trash2, Loader2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface ProductFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    productId?: string | null;
}

interface VariantDraft {
    id: string; // temp id
    name: string; // e.g. "170cm"
    sku: string; // optional
}

export function ProductForm({ open, onOpenChange, onSuccess, productId }: ProductFormProps) {
    const { provider } = useAuth();
    const [loading, setLoading] = useState(false);

    // Product State
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // Variant State
    const [variants, setVariants] = useState<VariantDraft[]>([
        { id: '1', name: 'Standard', sku: '' }
    ]);

    // Fetch Data on Edit
    React.useEffect(() => {
        if (open && productId) {
            setLoading(true);
            const fetchData = async () => {
                const { data: prod, error } = await supabase
                    .from('products')
                    .select('*, product_variants(*)')
                    .eq('id', productId)
                    .single();

                if (error) {
                    toast.error('Failed to load product');
                    onOpenChange(false);
                    return;
                }

                setName(prod.name);
                setCategory(prod.category);
                setBasePrice(((prod.base_price_cents || 0) / 100).toString());
                setDescription(prod.description || '');
                setImageUrl(prod.image_url || '');

                if (prod.product_variants && prod.product_variants.length > 0) {
                    interface VariantRow {
                        id: string;
                        name: string;
                        sku: string | null;
                    }
                    setVariants((prod.product_variants as unknown as VariantRow[]).map((v) => ({
                        id: v.id,
                        name: v.name,
                        sku: v.sku || ''
                    })));
                } else {
                    setVariants([{ id: '1', name: 'Standard', sku: '' }]);
                }
                setLoading(false);
            };
            fetchData();
        } else if (open && !productId) {
            // Reset for Create Mode
            setName('');
            setCategory('');
            setBasePrice('');
            setDescription('');
            setImageUrl('');
            setVariants([{ id: '1', name: 'Standard', sku: '' }]);
            setVariants([{ id: '1', name: 'Standard', sku: '' }]);
        }
    }, [open, productId, onOpenChange]);

    const addVariant = () => {
        setVariants([...variants, { id: Math.random().toString(), name: '', sku: '' }]);
    };

    const removeVariant = (id: string) => {
        if (variants.length > 1) {
            setVariants(variants.filter(v => v.id !== id));
        }
    };

    const updateVariant = (id: string, field: keyof VariantDraft, value: string) => {
        setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleSubmit = async () => {
        if (!provider?.id) return;
        if (!name || !category || !basePrice) {
            toast.error('Missing required fields');
            return;
        }

        setLoading(true);
        try {
            let prodId = productId;

            if (productId) {
                // UPDATE
                const { error: pErr } = await supabase.from('products').update({
                    name,
                    category,
                    description,
                    image_url: imageUrl || null,
                    base_price_cents: Math.round(parseFloat(basePrice) * 100)
                }).eq('id', productId);
                if (pErr) throw pErr;
                toast.success('Product updated');
            } else {
                // CREATE
                const { data: prod, error: pErr } = await supabase.from('products').insert({
                    provider_id: provider.id,
                    name,
                    category,
                    description,
                    image_url: imageUrl || null,
                    base_price_cents: Math.round(parseFloat(basePrice) * 100)
                }).select().single();
                if (pErr) throw pErr;
                prodId = prod.id;
            }

            if (!prodId) throw new Error("No Product ID");

            // Handle Variants (Upsert)
            // Strategy: We upsert. If variants have UUID-like ID, they update. If random ID, we treat as new (remove ID for insert).

            const variantsToUpsert = variants.map(v => {
                const isRealId = v.id.length > 10; // Simple UUID check
                return {
                    id: isRealId ? v.id : undefined, // Let DB generate ID if new
                    product_id: prodId,
                    name: v.name || 'Standard',
                    sku: v.sku || null
                };
            });

            // Note: Supabase upsert needs to know conflict column. 'id' is primary key.
            const { error: vErr } = await supabase.from('product_variants').upsert(variantsToUpsert);
            if (vErr) throw vErr;

            if (!productId) toast.success('Product created successfully');
            onSuccess();
            onOpenChange(false);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Failed to save product', { description: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{productId ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Main Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label>Product Name</Label>
                            <Input placeholder="e.g. Atomic Bent Chetler" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GEAR_CATEGORIES.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label>Daily Price (CZK)</Label>
                            <Input type="number" placeholder="500" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
                        </div>
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <Label>Image URL</Label>
                            <Input placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Description</Label>
                            <Textarea placeholder="Details about specific model year..." value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                    </div>

                    {/* Variants Section */}
                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Variants / Sizes</h4>
                            <Button variant="outline" size="sm" onClick={addVariant}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Variant
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {variants.map((v, idx) => (
                                <div key={v.id} className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={idx === 0 ? "Standard / One Size" : "Size (e.g. 170cm)"}
                                            value={v.name}
                                            onChange={e => updateVariant(v.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            placeholder="SKU (Optional)"
                                            value={v.sku}
                                            onChange={e => updateVariant(v.id, 'sku', e.target.value)}
                                        />
                                    </div>
                                    {variants.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => removeVariant(v.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Add variants for different sizes (e.g. S, M, L or 160, 170). If it's one-size fits all, leave as "Standard".
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                        {productId ? 'Save Changes' : 'Create Product'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
