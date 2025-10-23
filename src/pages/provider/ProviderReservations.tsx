import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatDateRange, formatPrice } from "@/lib/availability";
import { Plus, Search, Calendar, Loader2, Filter, ChevronDown, ChevronUp, Phone, Mail, Edit, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

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

  // Toggle row expansion
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

  // Action handlers
  const handleConfirmReservation = async (reservationId: string) => {
    const reservation = filteredReservations.find(r => r.id === reservationId);
    if (reservation?.status === 'confirmed' || reservation?.status === 'active') {
      toast.info(t('provider.reservations.alreadyConfirmed'));
      return;
    }

    setLoadingActions(prev => ({ ...prev, [reservationId]: true }));

    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;

      // Update local state
      setReservations(prev =>
        prev.map(r => r.id === reservationId ? { ...r, status: 'confirmed' } : r)
      );

      toast.success(t('provider.reservations.confirmSuccess'));
    } catch (error) {
      console.error('Error confirming reservation:', error);
      toast.error(t('provider.reservations.confirmError'));
    } finally {
      setLoadingActions(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    const reservation = filteredReservations.find(r => r.id === reservationId);
    if (reservation?.status === 'cancelled' || reservation?.status === 'completed') {
      toast.info(t('provider.reservations.cannotCancel'));
      return;
    }

    if (!confirm(t('provider.reservations.cancelConfirm'))) {
      return;
    }

    setLoadingActions(prev => ({ ...prev, [reservationId]: true }));

    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;

      // Update local state
      setReservations(prev =>
        prev.map(r => r.id === reservationId ? { ...r, status: 'cancelled' } : r)
      );

      toast.success(t('provider.reservations.cancelSuccess'));
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error(t('provider.reservations.cancelError'));
    } finally {
      setLoadingActions(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const handleCallCustomer = (phone: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleEmailCustomer = (email: string | null) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handleEditReservation = (reservationId: string) => {
    navigate(`/provider/reservations/edit/${reservationId}`);
  };

  // Status badge styling
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

  // Get available actions based on status
  const getAvailableActions = (status: string | null) => {
    switch (status) {
      case 'hold':
      case 'pending':
        return ['confirm', 'edit', 'cancel'];
      case 'confirmed':
        return ['edit', 'cancel'];
      case 'active':
        return ['edit'];
      case 'completed':
      case 'cancelled':
        return [];
      default:
        return ['edit'];
    }
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
            {/* Desktop: Expandable Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="w-12"></th>
                    <th className="text-left py-3 px-4 font-medium">Zákazník</th>
                    <th className="text-left py-3 px-4 font-medium">Vybavení</th>
                    <th className="text-left py-3 px-4 font-medium">Termín</th>
                    <th className="text-left py-3 px-4 font-medium">Cena</th>
                    <th className="text-left py-3 px-4 font-medium">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => {
                    const isExpanded = expandedRows.has(reservation.id);
                    const availableActions = getAvailableActions(reservation.status);
                    const isLoading = loadingActions[reservation.id];

                    return (
                      <React.Fragment key={reservation.id}>
                        {/* Main Row */}
                        <tr
                          className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => toggleRowExpansion(reservation.id)}
                        >
                          <td className="py-4 px-4">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </td>
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

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="border-b bg-muted/30">
                            <td colSpan={6} className="py-4 px-4">
                              <div className="space-y-4 ml-8">
                                {/* Contact & Details Section */}
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Contact Info */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                      <Mail className="w-4 h-4" />
                                      Kontaktní informace
                                    </h4>
                                    <div className="text-sm space-y-1 pl-6">
                                      {reservation.customer_email && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Email:</span>
                                          <span>{reservation.customer_email}</span>
                                        </div>
                                      )}
                                      {reservation.customer_phone && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Telefon:</span>
                                          <span>{reservation.customer_phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reservation Details */}
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" />
                                      Detaily rezervace
                                    </h4>
                                    <div className="text-sm space-y-1 pl-6">
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-mono text-xs">{reservation.id.slice(0, 8)}...</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Záloha:</span>
                                        <span>{reservation.deposit_paid ? '✓ Zaplaceno' : '✗ Nezaplaceno'}</span>
                                      </div>
                                      {reservation.created_at && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Vytvořeno:</span>
                                          <span>{new Date(reservation.created_at).toLocaleDateString('cs-CZ')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                {reservation.notes && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">Poznámky:</h4>
                                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                      {reservation.notes}
                                    </p>
                                  </div>
                                )}

                                <Separator />

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Contact Actions - Always available */}
                                  {reservation.customer_phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCallCustomer(reservation.customer_phone);
                                      }}
                                    >
                                      <Phone className="w-4 h-4 mr-2" />
                                      Zavolat
                                    </Button>
                                  )}
                                  {reservation.customer_email && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEmailCustomer(reservation.customer_email);
                                      }}
                                    >
                                      <Mail className="w-4 h-4 mr-2" />
                                      Email
                                    </Button>
                                  )}

                                  <div className="flex-1" />

                                  {/* Status-based Actions */}
                                  {availableActions.includes('confirm') && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmReservation(reservation.id);
                                      }}
                                      disabled={isLoading}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      {isLoading ? 'Potvrzuji...' : 'Potvrdit'}
                                    </Button>
                                  )}
                                  {availableActions.includes('edit') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditReservation(reservation.id);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Upravit
                                    </Button>
                                  )}
                                  {availableActions.includes('cancel') && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelReservation(reservation.id);
                                      }}
                                      disabled={isLoading}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      {isLoading ? 'Ruším...' : 'Zrušit'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Expandable Card View */}
            <div className="md:hidden space-y-3">
              {filteredReservations.map((reservation) => {
                const isExpanded = expandedRows.has(reservation.id);
                const availableActions = getAvailableActions(reservation.status);
                const isLoading = loadingActions[reservation.id];

                return (
                  <Card key={reservation.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      {/* Header - Clickable to expand */}
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => toggleRowExpansion(reservation.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {reservation.customer_name}
                            </h3>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {reservation.gear_items?.name || 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>

                      {/* Basic Details - Always visible */}
                      <div className="space-y-2 text-sm">
                        {reservation.customer_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
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

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="space-y-3 pt-3 border-t">
                          {/* Additional Details */}
                          <div className="space-y-2 text-sm">
                            {reservation.customer_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs">{reservation.customer_email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono text-xs">{reservation.id.slice(0, 12)}...</span>
                            </div>
                            {reservation.created_at && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Vytvořeno:</span>
                                <span className="text-xs">{new Date(reservation.created_at).toLocaleDateString('cs-CZ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {reservation.notes && (
                            <div className="bg-muted/50 p-3 rounded-md">
                              <p className="text-xs text-muted-foreground">
                                <strong>Poznámky:</strong> {reservation.notes}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Contact buttons - always available */}
                            {reservation.customer_phone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallCustomer(reservation.customer_phone);
                                }}
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Zavolat
                              </Button>
                            )}
                            {reservation.customer_email && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailCustomer(reservation.customer_email);
                                }}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email
                              </Button>
                            )}

                            {/* Status-based actions */}
                            {availableActions.includes('confirm') && (
                              <Button
                                size="sm"
                                className="w-full col-span-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmReservation(reservation.id);
                                }}
                                disabled={isLoading}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                {isLoading ? 'Potvrzuji...' : 'Potvrdit'}
                              </Button>
                            )}
                            {availableActions.includes('edit') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditReservation(reservation.id);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Upravit
                              </Button>
                            )}
                            {availableActions.includes('cancel') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelReservation(reservation.id);
                                }}
                                disabled={isLoading}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                {isLoading ? 'Ruším...' : 'Zrušit'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
};

export default ProviderReservations;
