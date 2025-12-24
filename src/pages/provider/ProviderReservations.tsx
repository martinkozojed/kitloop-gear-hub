import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDateRange, formatPrice } from "@/lib/availability";
import { Plus, Search, Calendar, Loader2, Filter, ChevronDown, ChevronUp, Phone, Mail, Edit, CheckCircle, XCircle, AlertCircle, ArrowRightLeft, LayoutGrid, List } from "lucide-react";
import ReservationCalendar from "@/components/reservations/ReservationCalendar";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

interface Reservation {
  id: string;
  created_at: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'hold' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | null;
  total_price: number | null;
  deposit_paid: boolean | null;
  notes: string | null;
  // Legacy
  gear_items: {
    name: string | null;
    category: string | null;
  } | null;
  // Inventory 2.0
  product_variants: {
    name: string;
    products: {
      name: string;
      category: string;
    } | null;
  } | null;
}

const ProviderReservations = () => {
  const { provider } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const [showFilters, setShowFilters] = useState(false);

  // Fetch reservations
  useEffect(() => {
    const fetchReservations = async () => {
      if (!provider?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            id,
            created_at,
            customer_name,
            customer_email,
            customer_phone,
            start_date,
            end_date,
            status,
            total_price,
            deposit_paid,
            notes,
            gear_items:gear_id (
              name,
              category
            ),
            product_variants:product_variant_id (
              name,
              products (
                name,
                category
              )
            )
          `)
          .eq('provider_id', provider.id)
          .order('start_date', { ascending: false });

        if (error) throw error;

        // Normalize response
        const normalizedReservations: Reservation[] = (data || []).map((r: any) => ({
          ...r,
          gear_items: Array.isArray(r.gear_items) ? r.gear_items[0] : r.gear_items,
          product_variants: Array.isArray(r.product_variants) ? r.product_variants[0] : r.product_variants
        }));

        setReservations(normalizedReservations);
        setFilteredReservations(normalizedReservations);
      } catch (error) {
        console.error('Error fetching reservations:', error);
        toast.error('Chyba při načítání rezervací');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [provider?.id]);

  // Filter reservations
  useEffect(() => {
    let filtered = [...reservations];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const gearName = r.gear_items?.name || '';
        const prodName = r.product_variants?.products?.name || '';
        const variantName = r.product_variants?.name || '';

        return (
          r.customer_name?.toLowerCase().includes(query) ||
          r.customer_email?.toLowerCase().includes(query) ||
          r.customer_phone?.toLowerCase().includes(query) ||
          gearName.toLowerCase().includes(query) ||
          prodName.toLowerCase().includes(query) ||
          variantName.toLowerCase().includes(query)
        );
      });
    }

    setFilteredReservations(filtered);
  }, [reservations, searchQuery, statusFilter]);

  const toggleRowExpansion = (reservationId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  };

  const handleAction = async (reservationId: string, action: 'confirm' | 'cancel') => {
    setLoadingActions(prev => ({ ...prev, [reservationId]: true }));
    try {
      const status = action === 'confirm' ? 'confirmed' : 'cancelled';
      const { error } = await supabase.from('reservations').update({ status }).eq('id', reservationId);
      if (error) throw error;

      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status } : r));
      toast.success(`Rezervace ${action === 'confirm' ? 'potvrzena' : 'zrušena'}`);
    } catch (e) {
      console.error(e);
      toast.error('Akce se nezdařila');
    } finally {
      setLoadingActions(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const getItemName = (r: Reservation) => {
    if (r.product_variants) {
      return `${r.product_variants.products?.name || 'Produkt'} - ${r.product_variants.name}`;
    }
    return r.gear_items?.name || 'Neznámá položka';
  };

  const getItemCategory = (r: Reservation) => {
    if (r.product_variants) {
      return r.product_variants.products?.category;
    }
    return r.gear_items?.category;
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      hold: { label: t('provider.dashboard.status.hold'), variant: 'outline' },
      pending: { label: t('provider.dashboard.status.pending'), variant: 'outline' },
      confirmed: { label: t('provider.dashboard.status.confirmed'), variant: 'default' },
      active: { label: t('provider.dashboard.status.active'), variant: 'secondary' },
      completed: { label: t('provider.dashboard.status.completed'), variant: 'secondary' },
      cancelled: { label: t('provider.dashboard.status.cancelled'), variant: 'destructive' },
    };

    const config = statusMap[status || 'pending'] || { label: status || 'Neznámý', variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Rezervace</h1>
            <p className="text-muted-foreground">Spravujte rezervace vašeho vybavení</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/provider/reservations/new">
                <Plus className="w-4 h-4 mr-2" />
                Nová rezervace
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="list"><List className="w-4 h-4 mr-2" /> Seznam</TabsTrigger>
              <TabsTrigger value="calendar"><LayoutGrid className="w-4 h-4 mr-2" /> Kalendář</TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> Filtry
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4 bg-muted/30">
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Hledat..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Stav" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Vše</SelectItem>
                    <SelectItem value="confirmed">Potvrzeno</SelectItem>
                    <SelectItem value="active">Aktivní</SelectItem>
                    <SelectItem value="completed">Dokončeno</SelectItem>
                    <SelectItem value="cancelled">Zrušeno</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <TabsContent value="list" className="space-y-4">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Žádné rezervace k zobrazení.</div>
            ) : (
              <div className="rounded-md border bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 font-medium">Zákazník</th>
                      <th className="p-4 font-medium">Vybavení</th>
                      <th className="p-4 font-medium">Termín</th>
                      <th className="p-4 font-medium">Stav</th>
                      <th className="p-4 font-medium w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map(r => (
                      <React.Fragment key={r.id}>
                        <tr className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => toggleRowExpansion(r.id)}>
                          <td className="p-4 font-medium">{r.customer_name}</td>
                          <td className="p-4">
                            <div className="font-medium">{getItemName(r)}</div>
                            <div className="text-xs text-muted-foreground">{getItemCategory(r)}</div>
                          </td>
                          <td className="p-4">
                            {r.start_date && r.end_date && formatDateRange(new Date(r.start_date), new Date(r.end_date))}
                          </td>
                          <td className="p-4">{getStatusBadge(r.status)}</td>
                          <td className="p-4">{expandedRows.has(r.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</td>
                        </tr>
                        {expandedRows.has(r.id) && (
                          <tr className="bg-muted/20">
                            <td colSpan={5} className="p-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Kontakt</h4>
                                  <div className="text-sm space-y-1">
                                    <div>{r.customer_email}</div>
                                    <div>{r.customer_phone}</div>
                                  </div>
                                </div>
                                <div className="flex gap-2 items-start justify-end">
                                  {r.status === 'hold' || r.status === 'pending' ? (
                                    <Button size="sm" onClick={() => handleAction(r.id, 'confirm')} disabled={loadingActions[r.id]}>
                                      {loadingActions[r.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                      Potvrdit
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="outline" asChild>
                                    <Link to={`/provider/reservations/edit/${r.id}`}>
                                      <Edit className="w-4 h-4 mr-2" /> Detail
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                              {r.notes && (
                                <div className="mt-4 p-3 bg-background rounded border text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Poznámka: </span> {r.notes}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            {provider?.id && (
              <div className="h-[600px] border rounded-lg shadow-sm">
                <ReservationCalendar providerId={provider.id} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProviderLayout>
  );
};

export default ProviderReservations;
