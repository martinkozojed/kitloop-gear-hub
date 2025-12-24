
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
import { Separator } from '@/components/ui/separator';

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

            if (error) throw error;

            const transformed = (data || []).map((a: any) => ({
                id: a.id,
                asset_tag: a.asset_tag,
                condition_score: a.condition_score,
                location: a.location,
                updated_at: a.updated_at,
                product: {
                    name: a.product_variants.products.name,
                    image_url: a.product_variants.products.image_url
                },
                variant: {
                    name: a.product_variants.name,
                    sku: a.product_variants.sku
                }
            }));

            setItems(transformed);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load maintenance items');
        } finally {
            setLoading(false);
        }
    }, [provider?.id]);

    useEffect(() => {
        fetchMaintenanceItems();
    }, [fetchMaintenanceItems]);

    const handleResolve = async (id: string) => {
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
                type: 'repair',
                status: 'completed',
                notes: 'Marked as resolved from dashboard',
                cost_cents: 0
            });

            toast.success('Asset returned to inventory');
            fetchMaintenanceItems();
        } catch (err: any) {
            toast.error('Failed to resolve', { description: err.message });
        }
    };

    return (
        <ProviderLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="w-6 h-6 text-orange-600" />
                        Maintenance & Service
                    </h1>
                    <p className="text-muted-foreground">
                        Track and manage equipment currently out of service.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">In Service</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{items.length}</div>
                            <p className="text-xs text-muted-foreground">Assets currently unavailable</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Repair Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">2.4 Days</div>
                            <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Service Costs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0 CZK</div>
                            <p className="text-xs text-muted-foreground">This month</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Service Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                                <p>All clear! No items in maintenance.</p>
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
                                                    Health: {item.condition_score}%
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Since: {format(new Date(item.updated_at), 'MMM d, p')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button size="sm" onClick={() => handleResolve(item.id)} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Finish
                                            </Button>
                                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                                Log Work
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
