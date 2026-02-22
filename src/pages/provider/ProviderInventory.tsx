import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Package, QrCode, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { InventoryGrid, InventoryAsset } from '@/components/operations/InventoryGrid';
import { softDeleteGearItems, updateGearItemStatus } from '@/lib/supabaseLegacy';
import { AssetDetailSheet } from '@/components/operations/AssetDetailSheet';
import { ProductForm } from '@/components/operations/ProductForm';
import { AssetForm } from '@/components/operations/AssetForm';
import { ScannerModal } from '@/components/operations/ScannerModal';
import { CsvImportModal } from '@/components/operations/CsvImportModal';
import { QuickAddAsset } from '@/components/onboarding/QuickAddAsset';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { exportInventoryCsv } from '@/lib/csv-export';
import { logEvent } from '@/lib/app-events';

import { generateDemoData } from '@/lib/demo-data';

import { usePermissions } from '@/hooks/usePermissions';

const ProviderInventory = () => {
  const { provider } = useAuth();
  const { canDeleteAssets } = usePermissions();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<InventoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === 'true';

  // Handle onboarding URL params
  useEffect(() => {
    if (searchParams.get('addAsset') === 'true') {
      setShowQuickAddModal(true);
      searchParams.delete('addAsset');
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
      searchParams.delete('import');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchInventory = useCallback(async () => {
    if (!provider?.id) return;
    setLoading(true);

    try {
      const { data: assets, error } = await supabase
        .from('assets')
        .select(`
          id,
          asset_tag,
          status,
          condition_score,
          location,
          created_at,
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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      interface AssetResponse {
        id: string;
        asset_tag: string;
        status: string;
        condition_score: number;
        location: string;
        product_variants: {
          name: string;
          sku: string | null;
          products: {
            name: string;
            category: string;
            image_url: string | null;
          } | null;
        } | null;
      }

      const transformed: InventoryAsset[] = (assets || []).map((a: unknown) => {
        const asset = a as AssetResponse;
        return {
          id: asset.id,
          asset_tag: asset.asset_tag,
          status: asset.status as InventoryAsset['status'],
          condition_score: asset.condition_score,
          location: asset.location,
          variant: {
            name: asset.product_variants?.name || t('provider.inventory.fallbacks.unknown'),
            sku: asset.product_variants?.sku || null
          },
          product: {
            name: asset.product_variants?.products?.name || t('provider.inventory.fallbacks.unknown'),
            category: asset.product_variants?.products?.category || t('provider.inventory.fallbacks.uncategorized'),
            image_url: asset.product_variants?.products?.image_url || null
          }
        };
      });

      setData(transformed);
    } catch (err: unknown) {
      console.error('Error fetching inventory:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('provider.inventory.toasts.fetchError'), { description: message });
    } finally {
      setLoading(false);
    }
  }, [provider?.id, t]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleEdit = (asset: InventoryAsset) => {
    setSelectedAssetId(asset.id);
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await softDeleteGearItems(supabase, ids);

      if (error) throw error;
      toast.success(t('provider.inventory.toasts.archiveSuccess', { count: ids.length }));
      fetchInventory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('provider.inventory.toasts.archiveError'), { description: message });
    }
  };

  const handleStatusChange = async (ids: string[], status: string) => {
    try {
      const { error } = await updateGearItemStatus(supabase, ids, status);
      if (error) throw error;
      toast.success(t('provider.inventory.toasts.statusSuccess', { count: ids.length }));
      fetchInventory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('provider.inventory.toasts.statusError'), { description: message });
    }
  };

  const handleScan = async (code: string) => {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('id')
        .eq('asset_tag', code)
        .eq('provider_id', provider?.id || '')
        .single();

      if (asset) {
        toast.success(t('provider.inventory.toasts.scanFound', { code }));
        setSelectedAssetId(asset.id);
      } else {
        toast.error(t('provider.inventory.toasts.scanNotFound', { code }));
      }
    } catch (err) {
      toast.error(t('provider.inventory.toasts.scanError'), { description: code });
    }
  };

  const handleGenerateDemo = async () => {
    if (!demoEnabled) {
      toast.error(t('provider.inventory.toasts.demoDisabled'));
      return;
    }

    if (!provider?.id) return;
    setLoading(true);
    try {
      await generateDemoData(provider.id);
      toast.success(t('provider.inventory.toasts.demoSuccess'));
      fetchInventory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('provider.inventory.toasts.demoError'), { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (productId: string) => {
    setSelectedProductId(productId);
    setShowProductForm(true);
  };

  const handleExportCsv = () => {
    if (data.length === 0) {
      toast.info(t('provider.inventory.toasts.exportEmpty', { defaultValue: 'Žádná data k exportu.' }));
      return;
    }
    exportInventoryCsv(
      data.map((a) => ({
        id: a.id,
        asset_tag: a.asset_tag,
        product_name: a.product.name,
        variant_name: a.variant.name,
        sku: a.variant.sku ?? null,
        status: a.status,
        created_at: '',
      }))
    );
    if (provider?.id) {
      void logEvent('export_inventory', {
        providerId: provider.id,
        metadata: { rows: data.length },
      });
    }
  };

  return (
    <ProviderLayout>
      <div className="space-y-6">
        <PageHeader
          title={t('provider.inventory.title')}
          description={t('provider.inventory.subtitle')}
          actions={
            <>
              <Button variant="outline" onClick={handleExportCsv} data-testid="inventory-export-csv" className="hidden sm:flex">
                <Download className="w-4 h-4 mr-2" />
                {t('provider.inventory.actions.exportCsv', { defaultValue: 'Export CSV' })}
              </Button>
              <Button variant="secondary" onClick={() => setShowScanner(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                {t('provider.inventory.actions.scan')}
              </Button>

              {demoEnabled && (
                <Button variant="outline" onClick={handleGenerateDemo} className="hidden sm:flex">
                  ⚡ {t('provider.inventory.actions.demo')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowImportModal(true)} className="hidden sm:flex">
                <Upload className="w-4 h-4 mr-2" />
                {t('provider.inventory.actions.import')}
              </Button>
              <Button variant="secondary" onClick={() => setShowProductForm(true)} className="hidden sm:flex">
                <Package className="w-4 h-4 mr-2" />
                {t('provider.inventory.actions.product')}
              </Button>
              <Button variant="primary" onClick={() => setShowAssetForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('provider.inventory.actions.addAsset')}
              </Button>
            </>
          }
        />

        <Card className="p-1 min-h-[500px]">
          <InventoryGrid
            data={data}
            loading={loading}
            onRefresh={fetchInventory}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onAddAsset={() => setShowAssetForm(true)}
            onImport={() => setShowImportModal(true)}
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
            toast.success(selectedProductId ? t('provider.inventory.productForm.updateSuccess') : t('provider.inventory.productForm.readyForAssets'));
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

        {/* Quick Add Modal for Onboarding */}
        <Dialog open={showQuickAddModal} onOpenChange={setShowQuickAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="sr-only">Rychlé přidání položky</DialogTitle>
            {provider?.id && (
              <QuickAddAsset
                providerId={provider.id}
                onSuccess={() => {
                  setShowQuickAddModal(false);
                  fetchInventory();
                }}
                onCancel={() => setShowQuickAddModal(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProviderLayout>
  );
};

export default ProviderInventory;
