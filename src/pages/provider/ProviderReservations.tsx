import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReservationStatus } from "@/lib/status-colors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportReservationsCsv } from '@/lib/csv-export';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error-utils";
import { formatDateRange, formatPrice } from "@/lib/availability";
import { Plus, Search, Calendar, Loader2, Filter, ChevronDown, ChevronUp, Phone, Mail, Edit, CheckCircle, XCircle, AlertCircle, ArrowRightLeft, LayoutGrid, List, Download, Link2 } from "lucide-react";
import ReservationCalendar from "@/components/reservations/ReservationCalendar";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { track } from '@/lib/telemetry';
import { logEvent } from '@/lib/app-events';
import { ContextTip } from '@/components/ui/context-tip';
import { getTip } from '@/content/microcopy.registry';

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

interface ReservationRequestRow {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  requested_start_date: string;
  requested_end_date: string;
  requested_gear_text: string | null;
  notes: string | null;
  created_at: string;
}

const ProviderReservations = () => {
  const { provider } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [requests, setRequests] = useState<ReservationRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);

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
        interface ReservationResponse {
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
          gear_items: { name: string | null; category: string | null } | { name: string | null; category: string | null }[] | null;
          product_variants: { name: string; products: { name: string; category: string } | null } | { name: string; products: { name: string; category: string } | null }[] | null;
        }

        const normalizedReservations: Reservation[] = ((data as unknown as ReservationResponse[]) || []).map((r) => ({
          ...r,
          status: r.status,
          gear_items: Array.isArray(r.gear_items) ? r.gear_items[0] : r.gear_items,
          product_variants: Array.isArray(r.product_variants) ? r.product_variants[0] : r.product_variants
        }));

        setReservations(normalizedReservations);
        setFilteredReservations(normalizedReservations);
      } catch (error) {
        console.error('Error fetching reservations:', error);
        toast.error(t('provider.reservations.toasts.fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [provider?.id, t]);

  // Fetch reservation_requests (pending)
  useEffect(() => {
    const fetchRequests = async () => {
      if (!provider?.id) return;
      setLoadingRequests(true);
      try {
        const { data, error } = await supabase
          .from('reservation_requests')
          .select('id, customer_name, customer_email, customer_phone, requested_start_date, requested_end_date, requested_gear_text, notes, created_at')
          .eq('provider_id', provider.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRequests((data as ReservationRequestRow[]) ?? []);
      } catch (e) {
        console.error('Error fetching requests:', e);
        toast.error(t('provider.reservations.toasts.fetchError'));
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchRequests();
  }, [provider?.id, t]);

  const handleRejectRequest = async (requestId: string) => {
    setRejectRequestId(null);
    try {
      const { data, error } = await supabase
        .from('reservation_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info(t('provider.requestLink.alreadyProcessed'));
        setRequests(prev => prev.filter(r => r.id !== requestId));
        return;
      }
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success(t('provider.requestLink.rejectedToast'));
    } catch (e) {
      toast.error(getErrorMessage(e) || 'Failed');
    }
  };

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
    track('reservations.open_detail', { reservation_id: reservationId }, 'ProviderReservations');
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
    const status = action === 'confirm' ? 'confirmed' : 'cancelled';
    track('reservations.status_change_started', { reservation_id: reservationId, target_status: status }, 'ProviderReservations');

    try {
      const { error } = await supabase.from('reservations').update({ status }).eq('id', reservationId);
      if (error) throw error;

      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status } : r));
      track('reservations.status_change_succeeded', { reservation_id: reservationId, new_status: status }, 'ProviderReservations');
      toast.success(action === 'confirm' ? t('provider.reservations.toasts.confirmed') : t('provider.reservations.toasts.cancelled'));
    } catch (e: unknown) {
      track('reservations.status_change_failed', { reservation_id: reservationId, target_status: status }, 'ProviderReservations');
      console.error(e);
      toast.error(t('provider.reservations.toasts.actionError'));
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

  // Status normalization helper for StatusBadge
  const normalizeStatus = (status: string | null): ReservationStatus => {
    const validStatuses: ReservationStatus[] = ['hold', 'pending', 'confirmed', 'active', 'completed', 'cancelled', 'overdue', 'ready', 'unpaid', 'conflict'];
    if (status && validStatuses.includes(status as ReservationStatus)) {
      return status as ReservationStatus;
    }
    return 'pending';
  };

  const handleExportCsv = () => {
    if (reservations.length === 0) {
      toast.info(t('provider.reservations.toasts.exportEmpty', { defaultValue: 'Žádná data k exportu.' }));
      return;
    }
    exportReservationsCsv(
      reservations.map((r) => ({
        id: r.id,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        total_lines: 1,
        created_at: r.created_at,
      }))
    );
    if (provider?.id) {
      void logEvent('export_reservations', {
        providerId: provider.id,
        metadata: { rows: reservations.length },
      });
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
        <PageHeader
          title={t('provider.reservations.title')}
          description={t('provider.reservations.subtitle')}
          actions={
            <>
              <Button variant="outline" className="hidden sm:flex" data-testid="reservations-export-csv" onClick={handleExportCsv}>
                <Download className="w-4 h-4 mr-2" />
                {t('provider.reservations.cta.exportCsv', { defaultValue: 'Export CSV' })}
              </Button>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/provider/reservations/new">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('provider.reservations.cta.new')}
                </Link>
              </Button>
            </>
          }
        />

        {/* Context Tip: pilot tip_no_reservation_24h — shown when loaded with 0 reservations */}
        {!loading && reservations.length === 0 && provider?.user_id && (
          <ContextTip
            key="tip_no_reservation_24h"
            tip={getTip('tip_no_reservation_24h')}
            userId={provider.user_id}
          />
        )}

        <Tabs defaultValue="list" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <TabsList className="w-full sm:w-auto flex overflow-x-auto">
              <TabsTrigger value="list" className="flex-1 sm:flex-none"><List className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{t('provider.reservations.tabs.list')}</span></TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 sm:flex-none"><LayoutGrid className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{t('provider.reservations.tabs.calendar')}</span></TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 sm:flex-none"><Link2 className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{t('provider.requestLink.requestsTab')}</span></TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto min-h-10">
              <Filter className="w-4 h-4 mr-2" /> {t('provider.reservations.filters.toggle')}
            </Button>
          </div>

          {showFilters && (
            <Card className="mb-4 bg-muted">
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t('provider.reservations.filters.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('provider.reservations.filters.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('provider.reservations.filters.all')}</SelectItem>
                    <SelectItem value="confirmed">{t('provider.reservations.filters.confirmed')}</SelectItem>
                    <SelectItem value="active">{t('provider.reservations.filters.active')}</SelectItem>
                    <SelectItem value="completed">{t('provider.reservations.filters.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('provider.reservations.filters.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <TabsContent value="list" className="space-y-4">
            {filteredReservations.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t('provider.reservations.empty')}
                description={t('provider.reservations.emptyDesc')}
                action={{
                  label: t('provider.reservations.cta.new'),
                  onClick: () => navigate('/provider/reservations/new'),
                }}
              />
            ) : (
              <div className="rounded-md border border-border bg-card">
                <Table className="min-w-[600px]">
                  <TableHeader className="border-b">
                    <TableRow>
                      <TableHead>{t('provider.reservations.table.customer')}</TableHead>
                      <TableHead>{t('provider.reservations.table.item')}</TableHead>
                      <TableHead>{t('provider.reservations.table.dates')}</TableHead>
                      <TableHead>{t('provider.reservations.table.status')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map(r => (
                      <React.Fragment key={r.id}>
                        <TableRow
                          className="hover:bg-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          onClick={() => toggleRowExpansion(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleRowExpansion(r.id);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-expanded={expandedRows.has(r.id)}
                          aria-label={t('provider.reservations.expandRow', { customer: r.customer_name })}
                          data-testid={`reservation-row-${r.id}`}
                        >
                          <TableCell className="font-medium" data-testid={`reservation-customer-${r.id}`}>{r.customer_name}</TableCell>
                          <TableCell>
                            <div className="font-medium">{getItemName(r)}</div>
                            <div className="text-xs text-muted-foreground">{getItemCategory(r)}</div>
                          </TableCell>
                          <TableCell>
                            {r.start_date && r.end_date && formatDateRange(new Date(r.start_date), new Date(r.end_date))}
                          </TableCell>
                          <TableCell data-testid={`reservation-status-${r.id}`}><StatusBadge status={normalizeStatus(r.status)} size="sm" /></TableCell>
                          <TableCell>{expandedRows.has(r.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</TableCell>
                        </TableRow>
                        {expandedRows.has(r.id) && (
                          <TableRow className="bg-muted hover:bg-muted">
                            <TableCell colSpan={5} className="p-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">{t('provider.reservations.table.contact')}</h4>
                                  <div className="text-sm space-y-1">
                                    <div>{r.customer_email}</div>
                                    <div>{r.customer_phone}</div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 items-start justify-end">
                                  {r.status === 'hold' || r.status === 'pending' ? (
                                    <Button size="sm" onClick={() => handleAction(r.id, 'confirm')} disabled={loadingActions[r.id]}>
                                      {loadingActions[r.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                      {t('provider.reservations.cta.confirm')}
                                    </Button>
                                  ) : null}
                                  {r.status !== 'cancelled' && r.status !== 'completed' ? (
                                    <Button size="sm" variant="destructive" data-testid={`cancel-reservation-${r.id}`} onClick={() => handleAction(r.id, 'cancel')} disabled={loadingActions[r.id]}>
                                      {t('provider.reservations.cta.cancel')}
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="outline" asChild>
                                    <Link to={`/provider/reservations/edit/${r.id}`}>
                                      <Edit className="w-4 h-4 mr-2" /> {t('provider.reservations.cta.detail')}
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                              {r.notes && (
                                <div className="mt-4 p-3 bg-background rounded border text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">{t('provider.reservations.table.note')}: </span> {r.notes}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            {provider?.id && (
              <div className="h-[600px] border border-border rounded-lg bg-card overflow-hidden">
                <ReservationCalendar providerId={provider.id} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {loadingRequests ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={Link2}
                title={t('provider.requestLink.empty')}
                description={t('provider.requestLink.emptyDesc')}
              />
            ) : (
              <div className="rounded-md border border-border bg-card">
                <Table className="min-w-[600px]">
                  <TableHeader className="border-b">
                    <TableRow>
                      <TableHead>{t('provider.requestLink.customer')}</TableHead>
                      <TableHead>{t('provider.requestLink.dates')}</TableHead>
                      <TableHead>{t('provider.requestLink.requestedGear')}</TableHead>
                      <TableHead>{t('provider.requestLink.receivedAt')}</TableHead>
                      <TableHead className="w-[180px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          <div>{req.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{req.customer_email ?? req.customer_phone ?? '—'}</div>
                        </TableCell>
                        <TableCell>
                          {req.requested_start_date} – {req.requested_end_date}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.requested_gear_text || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/provider/reservations/new?fromRequest=${req.id}`, { state: { fromRequest: req } })}
                            >
                              {t('provider.requestLink.createReservation')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectRequestId(req.id)}
                            >
                              {t('provider.requestLink.reject')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {rejectRequestId && (
              <AlertDialog open={!!rejectRequestId} onOpenChange={(open) => !open && setRejectRequestId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('provider.requestLink.reject')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('provider.requestLink.rejectConfirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <Button variant="outline" onClick={() => setRejectRequestId(null)}>{t('provider.reservations.buttons.cancel', 'Cancel')}</Button>
                    <Button variant="destructive" onClick={() => rejectRequestId && handleRejectRequest(rejectRequestId)}>
                      {t('provider.requestLink.reject')}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProviderLayout>
  );
};

export default ProviderReservations;
