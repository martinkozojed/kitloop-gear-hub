
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/ui/page-header';

interface MaintenanceItem {
    id: string;
    asset_tag: string;
    condition_score: number;
    location: string;
    product: {
        name: string;
        image_url: string | null;
    };
    variant: {
        name: string;
        sku: string | null;
    };
    updated_at: string;
}

const ProviderMaintenance = () => {
    const { provider } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState<MaintenanceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMaintenanceItems = useCallback(async () => {
        if (!provider?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('assets')
                .select(`
          id, asset_tag, condition_score, location, updated_at,
          product_variants ( name, sku, products ( name, image_url ) )
        `)
                .eq('provider_id', provider.id)
                .eq('status', 'maintenance')
                .order('updated_at', { ascending: false });

            interface AssetResponse {
                id: string;
                asset_tag: string;
                condition_score: number | null;
                location: string | null;
                updated_at: string | null;
                product_variants: {
                    name: string;
                    sku: string | null;
                    products: {
                        name: string;
                        image_url: string | null;
                    } | null;
                } | null;
            }

            const transformed = (data || []).map((a: AssetResponse) => ({
                id: a.id,
                asset_tag: a.asset_tag,
                condition_score: a.condition_score ?? 0,
                location: a.location || 'Unknown',
                updated_at: a.updated_at || new Date().toISOString(),
                product: {
                    name: a.product_variants?.products?.name || 'Unknown Product',
                    image_url: a.product_variants?.products?.image_url || null
                },
                variant: {
                    name: a.product_variants?.name || 'Unknown Variant',
                    sku: a.product_variants?.sku || null
                }
            }));

            setItems(transformed);
        } catch (err: unknown) {
            console.error(err);
            toast.error(t('operations.maintenance.toasts.loadError'));
        } finally {
            setLoading(false);
        }
    }, [provider?.id, t]);

    useEffect(() => {
        fetchMaintenanceItems();
    }, [fetchMaintenanceItems]);

    const handleResolve = async (id: string) => {
        if (!provider) {
            toast.error(t('operations.maintenance.toasts.error'));
            return;
        }

        try {
            // 1. Update Asset to Available
            const { error } = await supabase
                .from('assets')
                .update({ status: 'available' })
                .eq('id', id);

            if (error) throw error;

            // 2. Log Maintenance Record (Optional, but good practice)
            await supabase.from('maintenance_log').insert({
                asset_id: id,
                provider_id: provider.id,
                type: 'repair',
                status: 'completed',
                notes: 'Marked as resolved from dashboard',
                cost_cents: 0
            });

            toast.success(t('operations.maintenance.toasts.resolved'));
            fetchMaintenanceItems();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('operations.maintenance.toasts.error'), { description: message });
        }
    };

    return (
        <ProviderLayout>
            <div className="space-y-6">
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <Wrench className="w-6 h-6 text-orange-600" />
                            {t('operations.maintenance.title')}
                        </span>
                    }
                    description={t('operations.maintenance.subtitle')}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('operations.maintenance.stats.inService')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{items.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {t('operations.maintenance.stats.inServiceDesc')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('operations.maintenance.stats.avgRepairTime')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{t('operations.maintenance.stats.noData')}</div>
                            <p className="text-xs text-muted-foreground">
                                {t('operations.maintenance.stats.avgRepairTimeDesc')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('operations.maintenance.stats.serviceCosts')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{t('operations.maintenance.stats.noData')}</div>
                            <p className="text-xs text-muted-foreground">
                                {t('operations.maintenance.stats.serviceCostsDesc')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('operations.maintenance.queue.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">{t('operations.maintenance.queue.loading')}</div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                                <p>{t('operations.maintenance.queue.empty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map(item => (
                                    <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                                        {item.product.image_url && (
                                            <img src={item.product.image_url} className="w-12 h-12 rounded bg-gray-100 object-cover" />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{item.product.name}</h3>
                                                <Badge variant="outline">{item.variant.name}</Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1 font-mono text-xs bg-gray-100 px-1 rounded text-foreground">
                                                    {item.asset_tag}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                                    {t('operations.maintenance.queue.health', { score: item.condition_score })}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {t('operations.maintenance.queue.since', { date: format(new Date(item.updated_at), 'MMM d, p') })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button size="sm" onClick={() => handleResolve(item.id)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                {t('operations.maintenance.actions.finish')}
                                            </Button>
                                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                                {t('operations.maintenance.actions.logWork')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProviderLayout>
    );
};

export default ProviderMaintenance;

