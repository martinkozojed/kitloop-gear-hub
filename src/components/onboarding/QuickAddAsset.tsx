import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { track } from '@/lib/telemetry';
import { Loader2, Package, Check } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-utils';

interface QuickAddAssetProps {
    providerId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface Product {
    id: string;
    name: string;
    category: string;
}

interface Variant {
    id: string;
    name: string;
    sku: string;
}

/**
 * QuickAddAsset - Simplified asset creation for onboarding Step 3
 * 
 * Minimal fields:
 * - Product name (required) - creates new product if needed
 * - Variant name (default: "Standard")
 * - Asset tag (auto-generated if empty)
 * - Price per day (optional)
 */
export const QuickAddAsset: React.FC<QuickAddAssetProps> = ({
    providerId,
    onSuccess,
    onCancel,
}) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        productName: '',
        variantName: 'Standard',
        assetTag: '',
        pricePerDay: '',
        category: 'outdoor-gear',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const generateAssetTag = () => {
        const prefix = formData.productName.slice(0, 3).toUpperCase() || 'AST';
        const num = Math.floor(Math.random() * 9000) + 1000;
        return `${prefix}-${num}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        if (!formData.productName.trim()) {
            setErrors({ productName: 'Název produktu je povinný' });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            // 1. Create product
            const { data: product, error: productError } = await supabase
                .from('products')
                .insert({
                    provider_id: providerId,
                    name: formData.productName.trim(),
                    category: formData.category,
                    price_per_day: formData.pricePerDay ? parseFloat(formData.pricePerDay) : null,
                })
                .select()
                .single();

            if (productError) throw productError;

            // 2. Create variant
            const { data: variant, error: variantError } = await supabase
                .from('product_variants')
                .insert({
                    product_id: product.id,
                    name: formData.variantName.trim() || 'Standard',
                    sku: `${formData.productName.slice(0, 3).toUpperCase()}-STD`,
                })
                .select()
                .single();

            if (variantError) throw variantError;

            // 3. Create asset
            const assetTag = formData.assetTag.trim() || generateAssetTag();
            const { error: assetError } = await supabase
                .from('assets')
                .insert({
                    provider_id: providerId,
                    product_id: product.id,
                    variant_id: variant.id,
                    asset_tag: assetTag,
                    status: 'available',
                    condition: 'good',
                });

            if (assetError) throw assetError;

            // 4. Update onboarding progress (table not in generated types yet)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from('onboarding_progress')
                .update({ step_inventory_completed_at: new Date().toISOString() })
                .eq('provider_id', providerId);

            track('inventory.asset_created', {
                quick_add: true,
                has_price: !!formData.pricePerDay
            });

            setIsSuccess(true);
            toast.success('Položka úspěšně přidána!');

            // Callback after delay
            setTimeout(() => {
                onSuccess?.();
            }, 1500);

        } catch (error) {
            console.error('Failed to create asset:', error);
            toast.error(getErrorMessage(error) || 'Nepodařilo se přidat položku');
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-900">
                        Položka přidána!
                    </h3>
                    <p className="text-emerald-600 mt-1">
                        Teď můžete vytvořit první rezervaci.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Rychlé přidání položky
                </CardTitle>
                <CardDescription>
                    Stačí vyplnit název a máte hotovo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="productName">Název produktu *</Label>
                        <Input
                            id="productName"
                            placeholder="např. Turistické hole, Stan 2-osoby..."
                            value={formData.productName}
                            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                            className={errors.productName ? 'border-red-500' : ''}
                        />
                        {errors.productName && (
                            <p className="text-sm text-red-500">{errors.productName}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="variantName">Varianta / Velikost</Label>
                            <Input
                                id="variantName"
                                placeholder="Standard"
                                value={formData.variantName}
                                onChange={(e) => setFormData(prev => ({ ...prev, variantName: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assetTag">Značka (ID)</Label>
                            <Input
                                id="assetTag"
                                placeholder="Auto-generována"
                                value={formData.assetTag}
                                onChange={(e) => setFormData(prev => ({ ...prev, assetTag: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pricePerDay">Cena za den</Label>
                            <Input
                                id="pricePerDay"
                                type="number"
                                placeholder="0"
                                value={formData.pricePerDay}
                                onChange={(e) => setFormData(prev => ({ ...prev, pricePerDay: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategorie</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="outdoor-gear">Outdoor</SelectItem>
                                    <SelectItem value="winter-sports">Zimní sporty</SelectItem>
                                    <SelectItem value="water-sports">Vodní sporty</SelectItem>
                                    <SelectItem value="camping">Kempování</SelectItem>
                                    <SelectItem value="climbing">Lezení</SelectItem>
                                    <SelectItem value="other">Ostatní</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Zrušit
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="primary"
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Přidávám...
                                </>
                            ) : (
                                'Přidat položku'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default QuickAddAsset;
