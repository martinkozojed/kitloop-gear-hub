import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDateRange, formatPrice } from "@/lib/availability";
import { Plus, Search, Calendar, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

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
  gear_items: {
    name: string | null;
    category: string | null;
  } | null;
}

type GearItemRelation = {
  name: string | null;
  category: string | null;
};

type SupabaseReservation = Omit<Reservation, 'gear_items'> & {
  gear_items: GearItemRelation | GearItemRelation[] | null;
};

const ProviderReservations = () => {
  const { provider } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
            )
          `)
          .eq('provider_id', provider.id)
          .order('start_date', { ascending: false });

        if (error) throw error;

        const normalizedReservations: Reservation[] = ((data ?? []) as SupabaseReservation[])
          .map((reservation) => ({
            ...reservation,
            gear_items: Array.isArray(reservation.gear_items)
              ? reservation.gear_items[0] ?? null
              : reservation.gear_items,
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

    // Search filter (customer name, email, phone, gear name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.customer_name?.toLowerCase().includes(query) ||
        r.customer_email?.toLowerCase().includes(query) ||
        r.customer_phone?.toLowerCase().includes(query) ||
        r.gear_items?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredReservations(filtered);
  }, [reservations, searchQuery, statusFilter]);

  // Status badge styling
  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      hold: { label: 'Blokováno', variant: 'outline' },
      pending: { label: 'Čeká', variant: 'outline' },
      confirmed: { label: 'Potvrzeno', variant: 'default' },
      active: { label: 'Aktivní', variant: 'secondary' },
      completed: { label: 'Dokončeno', variant: 'secondary' },
      cancelled: { label: 'Zrušeno', variant: 'destructive' },
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Rezervace</h1>
            <p className="text-muted-foreground">
              Spravujte rezervace vašeho vybavení
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/provider/reservations/new">
              <Plus className="w-4 h-4 mr-2" />
              Nová rezervace
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat zákazníka nebo vybavení..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Všechny stavy" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="hold">Blokováno</SelectItem>
                  <SelectItem value="pending">Čeká</SelectItem>
                  <SelectItem value="confirmed">Potvrzeno</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="completed">Dokončeno</SelectItem>
                  <SelectItem value="cancelled">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {filteredReservations.length === 0 ? (
            'Žádné rezervace'
          ) : (
            `Zobrazeno: ${filteredReservations.length} ${
              filteredReservations.length === 1 ? 'rezervace' : 'rezervací'
            }`
          )}
        </div>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              {reservations.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">Žádné rezervace</h3>
                  <p className="text-muted-foreground mb-6">
                    Začněte vytvořením první rezervace pro zákazníka
                  </p>
                  <Button asChild>
                    <Link to="/provider/reservations/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Vytvořit rezervaci
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">Žádné výsledky</h3>
                  <p className="text-muted-foreground">
                    Zkuste upravit filtry nebo hledaný výraz
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Desktop: Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Zákazník</th>
                    <th className="text-left py-3 px-4 font-medium">Vybavení</th>
                    <th className="text-left py-3 px-4 font-medium">Termín</th>
                    <th className="text-left py-3 px-4 font-medium">Cena</th>
                    <th className="text-left py-3 px-4 font-medium">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">{reservation.customer_name}</div>
                          {reservation.customer_phone && (
                            <div className="text-sm text-muted-foreground">
                              {reservation.customer_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">{reservation.gear_items?.name || 'N/A'}</div>
                          {reservation.gear_items?.category && (
                            <div className="text-sm text-muted-foreground">
                              {reservation.gear_items.category}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {reservation.start_date && reservation.end_date ? (
                          <div className="text-sm">
                            {formatDateRange(
                              new Date(reservation.start_date),
                              new Date(reservation.end_date)
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">
                            {formatPrice(reservation.total_price || 0)}
                          </div>
                          {reservation.deposit_paid && (
                            <div className="text-xs text-green-600">Záloha ✓</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(reservation.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden space-y-3">
              {filteredReservations.map((reservation) => (
                <Card key={reservation.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {reservation.customer_name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {reservation.gear_items?.name || 'N/A'}
                        </p>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {reservation.customer_phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">📞</span>
                          <span>{reservation.customer_phone}</span>
                        </div>
                      )}
                      {reservation.start_date && reservation.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {formatDateRange(
                              new Date(reservation.start_date),
                              new Date(reservation.end_date)
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">
                          {formatPrice(reservation.total_price || 0)}
                        </span>
                        {reservation.deposit_paid && (
                          <span className="text-xs text-green-600">Záloha zaplacena</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
};

export default ProviderReservations;
