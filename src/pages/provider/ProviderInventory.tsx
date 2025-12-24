import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Package, QrCode, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { InventoryGrid, InventoryAsset } from '@/components/operations/InventoryGrid';
import { AssetDetailSheet } from '@/components/operations/AssetDetailSheet';
import { ProductForm } from '@/components/operations/ProductForm';
import { AssetForm } from '@/components/operations/AssetForm';
import { ScannerModal } from '@/components/operations/ScannerModal';
import { CsvImportModal } from '@/components/operations/CsvImportModal';

import { generateDemoData } from '@/lib/demo-data';

import { usePermissions } from '@/hooks/usePermissions';

const ProviderInventory = () => {
  const { provider } = useAuth();
  const { canDeleteAssets } = usePermissions();
  const { t } = useTranslation();
  const [data, setData] = useState<InventoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchInventory = useCallback(async () => {
    if (!provider?.id) return;
    setLoading(true);

    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          id, asset_tag, status, condition_score, location,
          product_variants ( name, sku, products ( name, category, image_url ) )
        `)
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const handleEdit = (asset: InventoryAsset) => {
    setSelectedAssetId(asset.id);
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      toast.success(`Archived ${ids.length} items (Soft Delete)`);
      fetchInventory();
    } catch (err: any) {
      toast.error('Deletion failed', { description: err.message });
    }
  };

  const handleStatusChange = async (ids: string[], status: string) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ status: status as any })
        .in('id', ids);
      if (error) throw error;
      toast.success(`Updated status for ${ids.length} items`);
      fetchInventory();
    } catch (err: any) {
      toast.error('Update failed', { description: err.message });
    }
  };

  const handleScan = async (code: string) => {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('id')
        .eq('asset_tag', code)
        .eq('provider_id', provider?.id)
        .single();

      if (asset) {
        toast.success(`Found: ${code}`);
        setSelectedAssetId(asset.id);
      } else {
        toast.error(`Asset not found: ${code}`);
      }
    } catch (err) {
      toast.error('Error searching asset', { description: code });
    }
  };

  const handleGenerateDemo = async () => {
    if (!provider?.id) return;
    setLoading(true);
    try {
      await generateDemoData(provider.id);
      toast.success('Generated 5 demo assets!');
      fetchInventory();
    } catch (err: any) {
      toast.error('Demo generation failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (productId: string) => {
    setSelectedProductId(productId);
    setShowProductForm(true);
  };

  return (
    <ProviderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('provider.inventory.title')}</h1>
            <p className="text-muted-foreground">
              Manage your physical assets, track status, and organize warehouse.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowScanner(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <QrCode className="w-4 h-4 mr-2" />
              Scan
            </Button>

            <Button variant="outline" onClick={handleGenerateDemo} className="hidden sm:flex">
              ⚡ Demo
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)} className="hidden sm:flex">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="secondary" onClick={() => setShowProductForm(true)} className="hidden sm:flex">
              <Package className="w-4 h-4 mr-2" />
              Product
            </Button>
            <Button onClick={() => setShowAssetForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        <Card className="p-1 min-h-[500px]">
          <InventoryGrid
            data={data}
            loading={loading}
            onRefresh={fetchInventory}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            canDelete={canDeleteAssets}
          />
        </Card>


        <AssetDetailSheet
          assetId={selectedAssetId}
          open={!!selectedAssetId}
          onOpenChange={(open) => !open && setSelectedAssetId(null)}
          onEditProduct={handleEditProduct}
        />

        <ProductForm
          open={showProductForm}
          onOpenChange={(open) => {
            setShowProductForm(open);
            if (!open) setSelectedProductId(null);
          }}
          productId={selectedProductId}
          onSuccess={() => {
            toast.success(selectedProductId ? "Product updated!" : "Ready to add assets!");
            fetchInventory();
          }}
        />

        <AssetForm
          open={showAssetForm}
          onOpenChange={setShowAssetForm}
          onSuccess={() => { fetchInventory(); }}
        />

        <ScannerModal
          open={showScanner}
          onOpenChange={setShowScanner}
          onScan={handleScan}
        />

        <CsvImportModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          onSuccess={fetchInventory}
        />
      </div>
    </ProviderLayout>
  );
};

export default ProviderInventory;
