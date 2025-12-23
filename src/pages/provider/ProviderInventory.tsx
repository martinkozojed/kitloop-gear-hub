import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Package, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { InventoryGrid, InventoryAsset } from '@/components/operations/InventoryGrid';
import { AssetDetailSheet } from '@/components/operations/AssetDetailSheet';

const ProviderInventory = () => {
  const { provider } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState<InventoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!provider?.id) return;
    setLoading(true);

    try {
      // Join assets -> variant -> product
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          id,
          asset_tag,
          status,
          condition_score,
          location,
          product_variants (
            name,
            sku,
            products (
              name,
              category,
              image_url
            )
          )
        `)
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match grid expected shape
      const transformed: InventoryAsset[] = (assets || []).map((a: any) => ({
        id: a.id,
        asset_tag: a.asset_tag,
        status: a.status,
        condition_score: a.condition_score,
        location: a.location,
        variant: {
          name: a.product_variants.name,
          sku: a.product_variants.sku
        },
        product: {
          name: a.product_variants.products.name,
          category: a.product_variants.products.category,
          image_url: a.product_variants.products.image_url
        }
      }));

      setData(transformed);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      toast.error('Failed to load inventory', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [provider?.id]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Handlers
  const handleEdit = (asset: InventoryAsset) => {
    setSelectedAssetId(asset.id);
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('assets').delete().in('id', ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} items`);
      fetchInventory();
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  };

  const handleStatusChange = async (ids: string[], status: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: status as any }) // Type cast for MVP
        .in('id', ids);

      if (error) throw error;

      toast.success(`Updated status for ${ids.length} items to ${status}`);
      fetchInventory();
    } catch (err: any) {
      toast.error('Update failed', { description: err.message });
    }
  };

  const handleGenerateDemo = async () => {
    if (!provider?.id) return;
    setLoading(true);
    try {
      // 1. Create Product
      const { data: prod, error: pErr } = await supabase.from('products').insert({
        provider_id: provider.id,
        name: 'Demo Atomic Skis',
        category: 'skis',
        base_price_cents: 45000,
        image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256'
      }).select().single();
      if (pErr) throw pErr;

      // 2. Create Variant
      const { data: variant, error: vErr } = await supabase.from('product_variants').insert({
        product_id: prod.id,
        name: '176cm',
        sku: 'DEMO-001'
      }).select().single();
      if (vErr) throw vErr;

      // 3. Create Assets
      const assetsToCreate = Array.from({ length: 5 }).map((_, i) => ({
        provider_id: provider.id,
        variant_id: variant.id,
        asset_tag: `DEMO-${Math.floor(Math.random() * 1000)}`,
        status: ['available', 'maintenance', 'rented'][i % 3] as any,
        condition_score: 90 - (i * 10),
        location: 'Warehouse A'
      }));

      const { error: aErr } = await supabase.from('assets').insert(assetsToCreate);
      if (aErr) throw aErr;

      toast.success('Generated 5 demo assets!');
      fetchInventory();
    } catch (err: any) {
      toast.error('Demo generation failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProviderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('provider.inventory.title')}</h1>
            <p className="text-muted-foreground">
              Manage your physical assets, track status, and organize warehouse.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateDemo}>
              ⚡ Demo Data
            </Button>
            <Button variant="outline" asChild>
              <Link to="/provider/inventory/import">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link to="/provider/inventory/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Link>
            </Button>
          </div>
        </div>

        {/* The Grid */}
        <Card className="p-1 min-h-[500px]">
          <InventoryGrid
            data={data}
            loading={loading}
            onRefresh={fetchInventory}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </Card>
      </div>

      <AssetDetailSheet
        assetId={selectedAssetId}
        open={!!selectedAssetId}
        onOpenChange={(open) => !open && setSelectedAssetId(null)}
      />
    </ProviderLayout>
  );
};

export default ProviderInventory;
