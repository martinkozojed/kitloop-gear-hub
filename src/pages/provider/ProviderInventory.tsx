import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GEAR_CATEGORIES, ITEM_STATES, CONDITIONS } from '@/lib/categories';
import { Plus, Search, Package, Edit, Trash2, X, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { isFetchError } from '@/lib/error-utils';
import { useTranslation } from 'react-i18next';

interface GearItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_per_day: number | null;
  quantity_total: number | null;
  quantity_available: number | null;
  item_state: string | null;
  condition: string | null;
  image_url: string | null;
  sku: string | null;
  created_at: string;
}

const ProviderInventory = () => {
  const { provider } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('📦 ProviderInventory: useEffect triggered, provider?.id =', provider?.id);

    // Reset loading state on mount
    setLoading(true);

    const fetchItems = async () => {
      console.log('📦 ProviderInventory: Fetching items for provider:', provider?.id);

      if (!provider?.id) {
        console.log('⚠️ No provider ID, setting loading=false');
        if (isMounted) {
          setLoading(false);
          toast.error(t('provider.inventory.toasts.noProviderTitle'), {
            description: t('provider.inventory.toasts.noProviderDescription')
          });
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gear_items')
          .select('*')
          .eq('provider_id', provider.id)
          .order('created_at', { ascending: false });

        if (!isMounted) {
          console.log('⚠️ Component unmounted, aborting items update');
          return;
        }

        if (error) {
          console.error('❌ Error fetching items:', error);

          // Handle specific errors
          if (error.code === 'PGRST301') {
            toast.error(t('provider.inventory.toasts.accessError'), {
              description: t('provider.inventory.toasts.accessDescription')
            });
          } else if (error.message.includes('Failed to fetch')) {
            toast.error(t('provider.inventory.toasts.networkError'), {
              description: t('provider.inventory.toasts.networkDescription')
            });
          } else {
            toast.error(t('provider.inventory.toasts.fetchError'), {
              description: error.message || t('provider.inventory.toasts.fetchDescription')
            });
          }
          setItems([]);
        } else {
          console.log('✅ Items fetched:', data?.length || 0);
          setItems(data || []);
        }
      } catch (error) {
        if (!isMounted) {
          console.log('⚠️ Component unmounted during error handling');
          return;
        }

        console.error('💥 Unexpected error:', error);

        if (isFetchError(error)) {
          toast.error(t('provider.inventory.toasts.networkError'), {
            description: t('provider.inventory.toasts.networkDescription')
          });
        } else {
          toast.error(t('provider.inventory.toasts.unexpectedError'), {
            description: t('provider.inventory.toasts.unexpectedDescription')
          });
        }
        setItems([]);
      } finally {
        if (isMounted) {
          console.log('🏁 Setting loading=false');
          setLoading(false);
        } else {
          console.log('⚠️ Component unmounted, skipping setLoading(false)');
        }
      }
    };

    fetchItems();

    // Cleanup function
    return () => {
      console.log('🧹 ProviderInventory: Cleaning up useEffect');
      isMounted = false;
    };
  }, [provider?.id, t]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    console.log('🗑️ Deleting item:', itemToDelete);

    try {
      const { error } = await supabase
        .from('gear_items')
        .delete()
        .eq('id', itemToDelete);

      if (error) {
        console.error('❌ Delete error:', error);

        if (error.code === 'PGRST301') {
          toast.error(t('provider.inventory.toasts.deleteAccessError'), {
            description: t('provider.inventory.toasts.accessDescription')
          });
        } else if (error.message.includes('foreign key')) {
          toast.error(t('provider.inventory.toasts.deleteForeignKey'), {
            description: t('provider.inventory.toasts.deleteForeignKeyDescription')
          });
        } else {
          toast.error(t('provider.inventory.toasts.deleteError'), {
            description: error.message || t('provider.inventory.toasts.fetchDescription')
          });
        }
        throw error;
      }

      console.log('✅ Item deleted successfully');
      toast.success(t('provider.inventory.toasts.deleteSuccess'), {
        description: t('provider.inventory.toasts.deleteSuccessDescription')
      });
      setItems(items.filter(item => item.id !== itemToDelete));
    } catch (error) {
      console.error('💥 Unexpected delete error:', error);
      // Error already handled above, no additional toast needed
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openDeleteDialog = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter items
  const filteredItems = items.filter(item => {
    // Search by name, SKU, or description
    const matchesSearch = debouncedSearch === '' ||
      item.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      false;

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.item_state === selectedStatus;
    const matchesCondition = selectedCondition === 'all' || item.condition === selectedCondition;

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
  });

  const hasActiveFilters = selectedCategory !== 'all' || selectedStatus !== 'all' || selectedCondition !== 'all' || debouncedSearch !== '';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedCondition('all');
  }, []);

  const totalLabel = filteredItems.length === items.length
    ? t('provider.inventory.totalAll', { count: items.length })
    : t('provider.inventory.totalFiltered', { filtered: filteredItems.length, total: items.length });

  const statusLabelMap: Record<string, string> = {
    available: t('provider.inventory.statusLabels.available'),
    reserved: t('provider.inventory.statusLabels.reserved'),
    maintenance: t('provider.inventory.statusLabels.maintenance'),
    retired: t('provider.inventory.statusLabels.retired')
  };

  const itemBeingDeleted = items.find(item => item.id === itemToDelete) || null;

  if (loading) {
    return (
      <ProviderLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </ProviderLayout>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <ProviderLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('provider.inventory.empty.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('provider.inventory.empty.description')}
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link to="/provider/inventory/new">
                <Plus className="w-4 h-4 mr-2" />
                {t('provider.inventory.buttons.addFirst')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/provider/inventory/import">
                {t('provider.inventory.buttons.import')}
              </Link>
            </Button>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('provider.inventory.title')}</h1>
            <p className="text-muted-foreground">
              {totalLabel}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild size="sm">
              <Link to="/provider/inventory/import">{t('provider.inventory.buttons.import')}</Link>
            </Button>
            <Button asChild>
              <Link to="/provider/inventory/new">
                <Plus className="w-4 h-4 mr-2" />
                {t('provider.inventory.buttons.add')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('provider.inventory.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t('provider.inventory.filters.categories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('provider.inventory.filters.categories')}</SelectItem>
                {GEAR_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('provider.inventory.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('provider.inventory.filters.status')}</SelectItem>
                {ITEM_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>
                    {statusLabelMap[state.value as keyof typeof statusLabelMap] || state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={selectedCondition} onValueChange={setSelectedCondition}>
            <SelectTrigger>
              <SelectValue placeholder={t('provider.inventory.filters.condition')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('provider.inventory.filters.condition')}</SelectItem>
              {CONDITIONS.map(cond => (
                <SelectItem key={cond.value} value={cond.value}>
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="md:col-start-4"
            >
              <FilterX className="w-4 h-4 mr-2" />
              {t('provider.inventory.filters.clear')}
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex gap-2 flex-wrap">
            {debouncedSearch && (
              <Badge variant="secondary" className="gap-1">
                {t('provider.inventory.filters.badge', { value: debouncedSearch })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {t('provider.inventory.filters.categoryBadge', {
                  value: GEAR_CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory
                })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
              </Badge>
            )}
            {selectedStatus !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {t('provider.inventory.filters.statusBadge', {
                  value: statusLabelMap[selectedStatus as keyof typeof statusLabelMap] || selectedStatus
                })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus('all')} />
              </Badge>
            )}
            {selectedCondition !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {t('provider.inventory.filters.conditionBadge', {
                  value: CONDITIONS.find(c => c.value === selectedCondition)?.label || selectedCondition
                })}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCondition('all')} />
              </Badge>
            )}
          </div>
        )}
      </div>

        {/* Desktop: Table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.image')}</th>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.name')}</th>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.category')}</th>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.price')}</th>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.quantity')}</th>
                <th className="text-left p-4 font-medium">{t('provider.inventory.table.status')}</th>
                <th className="text-right p-4 font-medium">{t('provider.inventory.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('Failed to load image:', item.image_url);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full p-2 flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg></div>';
                          }}
                        />
                      ) : (
                        <Package className="w-full h-full p-2 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {GEAR_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                  </td>
                  <td className="p-4">{t('provider.inventory.mobileCard.pricePerDay', { value: item.price_per_day })}</td>
                  <td className="p-4">
                    <span className={item.quantity_available === 0 ? 'text-red-600' : ''}>
                      {item.quantity_available}/{item.quantity_total}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.item_state === 'available' ? 'bg-green-100 text-green-700' :
                      item.item_state === 'reserved' ? 'bg-blue-100 text-blue-700' :
                      item.item_state === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {statusLabelMap[item.item_state as keyof typeof statusLabelMap] || item.item_state}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/provider/inventory/${item.id}/edit`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.warn('Failed to load image:', item.image_url);
                        e.currentTarget.style.display = 'none';
                        const packageIcon = document.createElement('div');
                        packageIcon.className = 'w-full h-full p-3';
                        packageIcon.innerHTML = '<svg class="w-full h-full text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>';
                        e.currentTarget.parentElement?.appendChild(packageIcon);
                      }}
                    />
                  ) : (
                    <Package className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {GEAR_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        item.item_state === 'available' ? 'bg-green-100 text-green-700 border-green-200' :
                        item.item_state === 'reserved' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    item.item_state === 'maintenance' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {statusLabelMap[item.item_state as keyof typeof statusLabelMap] || item.item_state}
                </Badge>
                    {item.condition && (
                      <Badge variant="outline" className="text-xs">
                        {CONDITIONS.find(c => c.value === item.condition)?.label || item.condition}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('provider.inventory.mobileCard.price')}</span>
                  <span className="font-semibold text-green-600 text-base">
                    {t('provider.inventory.mobileCard.pricePerDay', { value: item.price_per_day })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('provider.inventory.mobileCard.availability')}</span>
                  <span className={`font-medium ${item.quantity_available === 0 ? 'text-red-600' : ''}`}>
                    {t('provider.inventory.mobileCard.availabilityValue', {
                      available: item.quantity_available,
                      total: item.quantity_total
                    })}
                  </span>
                </div>
                {item.sku && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('provider.inventory.mobileCard.sku')}</span>
                    <span className="font-mono">{item.sku}</span>
                  </div>
                )}
              </div>

              <div className="flex border-t">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1 rounded-none h-12"
                  asChild
                >
                  <Link to={`/provider/inventory/${item.id}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('provider.inventory.mobileCard.edit')}
                  </Link>
                </Button>
                <div className="w-px bg-border"></div>
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1 rounded-none h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openDeleteDialog(item.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('provider.inventory.mobileCard.delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && items.length > 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground space-y-4">
              <Package className="w-16 h-16 mx-auto opacity-20" />
              <div>
                <p className="text-lg font-medium text-foreground mb-2">
                  {t('provider.inventory.filterResults.title')}
                </p>
                <p className="text-sm">
                  {debouncedSearch
                    ? t('provider.inventory.filterResults.searchHint')
                    : t('provider.inventory.filterResults.hint')}
                </p>
              </div>
              <Button variant="outline" onClick={clearFilters}>
                <FilterX className="w-4 h-4 mr-2" />
                {t('provider.inventory.filterResults.button')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('provider.inventory.dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('provider.inventory.dialog.question', { name: itemBeingDeleted?.name || '—' })}</p>
              <p className="text-red-600 font-medium">
                {t('provider.inventory.dialog.warning')}
              </p>
              {itemBeingDeleted?.price_per_day && itemBeingDeleted.price_per_day > 1000 && (
                <p className="text-orange-600 text-sm mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                  {t('provider.inventory.dialog.highValue', { price: itemBeingDeleted.price_per_day })}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('provider.inventory.dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('provider.inventory.dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProviderLayout>
  );
};

export default ProviderInventory;
