import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useProvider } from '@/context/ProviderContext';
import { supabase } from '@/lib/supabase';
import { Plus, Package, Trash2, Pencil, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    fetchKits,
    createKit,
    updateKit,
    deleteKit,
    type KitWithItems,
    type KitItem,
} from '@/services/kits';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface Variant {
    id: string;
    name: string;
    product_name: string;
}

interface KitItemDraft {
    variantId: string;
    variantLabel: string; // "Product / Variant"
    quantity: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const ProviderKits = () => {
    const { provider } = useProvider();
    const { t, i18n } = useTranslation();
    const cs = i18n.language.startsWith('cs');

    const [kits, setKits] = useState<KitWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingKit, setEditingKit] = useState<KitWithItems | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<KitItemDraft[]>([]);

    // Available variants for picker
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState('');

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const loadKits = useCallback(async () => {
        if (!provider?.id) return;
        setLoading(true);
        try {
            const data = await fetchKits(provider.id);
            setKits(data);
        } catch (err) {
            console.error('Error fetching kits:', err);
            toast.error(cs ? 'Chyba při načítání setů' : 'Failed to load kits');
        } finally {
            setLoading(false);
        }
    }, [provider?.id, cs]);

    const loadVariants = useCallback(async () => {
        if (!provider?.id) return;
        try {
            const { data, error } = await supabase
                .from('product_variants')
                .select('id, name, products:product_id(name)')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setVariants((data || []).map((v: any) => ({
                id: v.id,
                name: v.name,
                product_name: v.products?.name || '',
            })));
        } catch (err) {
            console.error('Error fetching variants:', err);
        }
    }, [provider?.id]);

    useEffect(() => { loadKits(); loadVariants(); }, [loadKits, loadVariants]);

    // ── Modal ──────────────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingKit(null);
        setName('');
        setDescription('');
        setItems([]);
        setSelectedVariant('');
        setModalOpen(true);
    };

    const openEdit = (kit: KitWithItems) => {
        setEditingKit(kit);
        setName(kit.name);
        setDescription(kit.description || '');
        setItems(kit.kit_items.map((item: KitItem) => ({
            variantId: item.variant_id,
            variantLabel: `${item.product_name} / ${item.variant_name}`,
            quantity: item.quantity,
        })));
        setSelectedVariant('');
        setModalOpen(true);
    };

    const addItem = () => {
        if (!selectedVariant) return;
        const v = variants.find(vr => vr.id === selectedVariant);
        if (!v) return;

        // Check if already added — increment quantity
        const existing = items.find(i => i.variantId === selectedVariant);
        if (existing) {
            setItems(items.map(i =>
                i.variantId === selectedVariant ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setItems([...items, {
                variantId: v.id,
                variantLabel: `${v.product_name} / ${v.name}`,
                quantity: 1,
            }]);
        }
        setSelectedVariant('');
    };

    const removeItem = (variantId: string) => {
        setItems(items.filter(i => i.variantId !== variantId));
    };

    const updateQuantity = (variantId: string, qty: number) => {
        if (qty < 1) return;
        setItems(items.map(i =>
            i.variantId === variantId ? { ...i, quantity: qty } : i
        ));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!provider?.id) return;
        if (!name.trim()) {
            toast.error(cs ? 'Vyplňte název setu' : 'Kit name is required');
            return;
        }
        if (items.length === 0) {
            toast.error(cs ? 'Přidejte alespoň jednu položku' : 'Add at least one item');
            return;
        }

        setSaving(true);
        try {
            const kitItems = items.map(i => ({
                variantId: i.variantId,
                quantity: i.quantity,
            }));

            if (editingKit) {
                await updateKit(editingKit.id, { name: name.trim(), description: description.trim() || undefined }, kitItems);
                toast.success(cs ? 'Set upraven' : 'Kit updated');
            } else {
                await createKit({
                    providerId: provider.id,
                    name: name.trim(),
                    description: description.trim() || undefined,
                    items: kitItems,
                });
                toast.success(cs ? 'Set vytvořen' : 'Kit created');
            }
            setModalOpen(false);
            loadKits();
        } catch (err) {
            console.error('Error saving kit:', err);
            toast.error(cs ? 'Chyba při ukládání setu' : 'Failed to save kit');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (kit: KitWithItems) => {
        try {
            await deleteKit(kit.id);
            toast.success(cs ? `Set "${kit.name}" archivován` : `Kit "${kit.name}" archived`);
            loadKits();
        } catch (err) {
            toast.error(cs ? 'Chyba při archivaci' : 'Failed to archive kit');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <ProviderLayout>
            <div className="space-y-6">
                <PageHeader
                    title={cs ? 'Sety (Kit Bundles)' : 'Kits (Bundles)'}
                    description={cs ? 'Sety pro rychlost, komponenty pro pravdu. Vytvořte sety pro rychlé vydávání.' : 'Bundles for speed, components for truth. Create kits for fast issuing.'}
                    actions={
                        <Button onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            {cs ? 'Nový set' : 'New Kit'}
                        </Button>
                    }
                />

                {/* Kit Cards */}
                {loading ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                        <div className="animate-pulse text-muted-foreground">Loading...</div>
                    </div>
                ) : kits.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {cs ? 'Žádné sety' : 'No kits yet'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {cs
                                ? 'Vytvořte svůj první set pro rychlé vydávání. Např. "Ferrata set komplet" = sedák + helma + lano + karabiny.'
                                : 'Create your first kit for fast issuing. E.g. "Via Ferrata Complete" = harness + helmet + rope + carabiners.'}
                        </p>
                        <Button onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            {cs ? 'Vytvořit první set' : 'Create first kit'}
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {kits.map(kit => (
                            <Card key={kit.id} className="relative group">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">{kit.name}</CardTitle>
                                            {kit.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{kit.description}</p>
                                            )}
                                        </div>
                                        <Badge variant="secondary">{kit.kit_items.length} {cs ? 'pol.' : 'items'}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <ul className="space-y-1 text-sm">
                                        {kit.kit_items.map(item => (
                                            <li key={item.id} className="flex items-center gap-2 text-muted-foreground">
                                                <span className="w-5 text-right font-mono text-xs">{item.quantity}×</span>
                                                <span>{item.product_name} / {item.variant_name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex gap-2 mt-4 pt-3 border-t">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(kit)} className="flex-1">
                                            <Pencil className="w-3 h-3 mr-1" />
                                            {cs ? 'Upravit' : 'Edit'}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(kit)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create / Edit Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingKit ? (cs ? 'Upravit set' : 'Edit Kit') : (cs ? 'Nový set' : 'New Kit')}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label>{cs ? 'Název setu' : 'Kit name'} *</Label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={cs ? 'např. Ferrata set komplet' : 'e.g. Via Ferrata Complete'}
                                />
                            </div>

                            <div>
                                <Label>{cs ? 'Popis (volitelný)' : 'Description (optional)'}</Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={cs ? 'Interní poznámka...' : 'Internal note...'}
                                    rows={2}
                                />
                            </div>

                            {/* Add variant */}
                            <div>
                                <Label>{cs ? 'Přidat položku' : 'Add item'}</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder={cs ? 'Vyberte variantu...' : 'Select variant...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {variants.map(v => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.product_name} / {v.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" onClick={addItem} disabled={!selectedVariant}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Item list */}
                            {items.length > 0 && (
                                <div>
                                    <Label className="mb-2 block">{cs ? 'Položky v setu' : 'Kit contents'} ({items.reduce((s, i) => s + i.quantity, 0)} {cs ? 'ks' : 'pcs'})</Label>
                                    <div className="space-y-2 border rounded-lg p-2">
                                        {items.map((item, idx) => (
                                            <div key={item.variantId} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <button type="button" onClick={() => moveItem(idx, 'up')} disabled={idx === 0}
                                                        className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button type="button" onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1}
                                                        className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <span className="flex-1 text-sm truncate">{item.variantLabel}</span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={e => updateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                                                    className="w-16 h-7 text-center text-sm"
                                                />
                                                <span className="text-xs text-muted-foreground">×</span>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.variantId)}
                                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setModalOpen(false)}>{cs ? 'Zrušit' : 'Cancel'}</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? '...' : (editingKit ? (cs ? 'Uložit' : 'Save') : (cs ? 'Vytvořit' : 'Create'))}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ProviderLayout>
    );
};

export default ProviderKits;
