import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Package, Calendar, CheckCircle, Clock, Phone, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/use-toast';

interface DashboardStats {
  totalItems: number;
  activeReservations: number;
  todayPickups: number;
  todayReturns: number;
  pendingReservations: number;
  availableItems: number;
}

interface SetupChecklist {
  profileCreated: boolean;
  firstItemAdded: boolean;
  testReservation: boolean;
  teamInvited: boolean;
  pricingConfigured: boolean;
}

interface AgendaEvent {
  id: string;
  type: 'pickup' | 'return';
  customer_name: string;
  customer_phone: string | null;
  gear_name: string;
  gear_category: string | null;
  time: string | null;
  status: string;
  notes: string | null;
}

type GearSummary = {
  name: string | null;
  category: string | null;
};

type ReservationWithGear = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  status: string;
  notes: string | null;
  gear_items: GearSummary | GearSummary[] | null;
};

type ReturnCondition = 'good' | 'minor' | 'damaged';

const DashboardOverview = () => {
  const { user, provider } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    activeReservations: 0,
    todayPickups: 0,
    todayReturns: 0,
    pendingReservations: 0,
    availableItems: 0,
  });
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [todayEvents, setTodayEvents] = useState<AgendaEvent[]>([]);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [eventToReturn, setEventToReturn] = useState<AgendaEvent | null>(null);
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [checklist, setChecklist] = useState<SetupChecklist>({
    profileCreated: true, // Always true if they're here
    firstItemAdded: false,
    testReservation: false,
    teamInvited: false,
    pricingConfigured: false,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!provider?.id) {
        if (isMountedRef.current) {
          setStats({
            totalItems: 0,
            activeReservations: 0,
            todayPickups: 0,
            todayReturns: 0,
            pendingReservations: 0,
            availableItems: 0,
          });
          setTodayEvents([]);
          setChecklist(prev => ({
            ...prev,
            firstItemAdded: false,
            testReservation: false,
          }));
          setLoading(false);
        }
        return;
      }

      // Fetch provider gear items with quantities
      const { data: gearItems, error: itemsError } = await supabase
        .from('gear_items')
        .select('id, quantity_available, active')
        .eq('provider_id', provider.id);

      if (itemsError) {
        console.error('❌ Error fetching items:', itemsError);
        return;
      }

      type GearItemRow = {
        id: string;
        quantity_available: number | null;
        active: boolean | null;
      };

      const typedGearItems = (gearItems ?? []) as GearItemRow[];
      const activeGear = typedGearItems.filter(item => item.active);
      const totalItemsCount = activeGear.length;
      const totalQuantity = activeGear.reduce((sum, item) => sum + (item.quantity_available ?? 0), 0);
      const gearIds = activeGear.map(item => item.id);

      let activeReservationsCount = 0;
      let pendingReservationsCount = 0;
      let todayPickupsCount = 0;
      let todayReturnsCount = 0;
      let reservedTodayUnits = 0;
      let events: AgendaEvent[] = [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString();

      if (gearIds.length > 0) {
        const [
          activeCountResult,
          pendingCountResult,
          pickupsCountResult,
          returnsCountResult,
          activeTodayResult,
          pickupsDataResult,
          returnsDataResult,
        ] = await Promise.all([
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .in('gear_id', gearIds)
            .in('status', ['hold', 'confirmed', 'active']),
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .in('gear_id', gearIds)
            .in('status', ['pending', 'hold']),
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .in('gear_id', gearIds)
            .gte('start_date', todayIso)
            .lt('start_date', tomorrowIso)
            .in('status', ['confirmed', 'hold']),
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .in('gear_id', gearIds)
            .gte('end_date', todayIso)
            .lt('end_date', tomorrowIso)
            .in('status', ['active']),
          supabase
            .from('reservations')
            .select('id', { count: 'exact', head: true })
            .in('gear_id', gearIds)
            .in('status', ['hold', 'confirmed', 'active'])
            .lt('start_date', tomorrowIso)
            .gt('end_date', todayIso),
          supabase
            .from('reservations')
            .select(`
              id,
              customer_name,
              customer_phone,
              pickup_time,
              status,
              notes,
              gear_items:gear_id (
                name,
                category
              )
            `)
            .in('gear_id', gearIds)
            .gte('start_date', todayIso)
            .lt('start_date', tomorrowIso)
            .in('status', ['confirmed', 'hold']),
          supabase
            .from('reservations')
            .select(`
              id,
              customer_name,
              customer_phone,
              return_time,
              status,
              notes,
              gear_items:gear_id (
                name,
                category
              )
            `)
            .in('gear_id', gearIds)
            .gte('end_date', todayIso)
            .lt('end_date', tomorrowIso)
            .in('status', ['active']),
        ]);

        if (activeCountResult.error) {
          console.error('❌ Error fetching active reservations:', activeCountResult.error);
        } else {
          activeReservationsCount = activeCountResult.count || 0;
        }

        if (pendingCountResult.error) {
          console.error('❌ Error fetching pending reservations:', pendingCountResult.error);
        } else {
          pendingReservationsCount = pendingCountResult.count || 0;
        }

        if (pickupsCountResult.error) {
          console.error('❌ Error fetching today\'s pickups:', pickupsCountResult.error);
        } else {
          todayPickupsCount = pickupsCountResult.count || 0;
        }

        if (returnsCountResult.error) {
          console.error('❌ Error fetching today\'s returns:', returnsCountResult.error);
        } else {
          todayReturnsCount = returnsCountResult.count || 0;
        }

        if (activeTodayResult.error) {
          console.error('❌ Error fetching active today:', activeTodayResult.error);
        } else {
          reservedTodayUnits = activeTodayResult.count || 0;
        }

        const castGearInfo = (item: ReservationWithGear): GearSummary | null => {
          if (!item.gear_items) return null;
          return Array.isArray(item.gear_items) ? item.gear_items[0] ?? null : item.gear_items;
        };

        if (!pickupsDataResult.error && pickupsDataResult.data) {
          pickupsDataResult.data.forEach((pickup: ReservationWithGear) => {
            const gearInfo = castGearInfo(pickup);
            events.push({
              id: pickup.id,
              type: 'pickup',
              customer_name: pickup.customer_name,
              customer_phone: pickup.customer_phone,
              gear_name: gearInfo?.name || 'Unknown',
              gear_category: gearInfo?.category || null,
              time: pickup.pickup_time ?? null,
              status: pickup.status,
              notes: pickup.notes,
            });
          });
        }

        if (!returnsDataResult.error && returnsDataResult.data) {
          returnsDataResult.data.forEach((returnItem: ReservationWithGear) => {
            const gearInfo = castGearInfo(returnItem);
            events.push({
              id: returnItem.id,
              type: 'return',
              customer_name: returnItem.customer_name,
              customer_phone: returnItem.customer_phone,
              gear_name: gearInfo?.name || 'Unknown',
              gear_category: gearInfo?.category || null,
              time: returnItem.return_time ?? null,
              status: returnItem.status,
              notes: returnItem.notes,
            });
          });
        }

        events.sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        });
      } else {
        events = [];
      }

      if (!isMountedRef.current) return;

      setTodayEvents(events);
      setStats({
        totalItems: totalItemsCount,
        activeReservations: activeReservationsCount,
        todayPickups: todayPickupsCount,
        todayReturns: todayReturnsCount,
        pendingReservations: pendingReservationsCount,
        availableItems: Math.max(0, totalQuantity - reservedTodayUnits),
      });

      setChecklist(prev => ({
        ...prev,
        firstItemAdded: totalItemsCount > 0,
        testReservation: activeReservationsCount > 0,
      }));
    } catch (error) {
      console.error('💥 Unexpected error fetching dashboard data:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [provider?.id]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleConfirmPickup = async (reservationId: string) => {
    // Find the event to check its current status
    const event = todayEvents.find(e => e.id === reservationId);

    // Prevent if already confirmed
    if (event?.status === 'confirmed') {
      toast({
        title: t('provider.dashboard.agenda.alreadyConfirmed'),
        description: t('provider.dashboard.agenda.alreadyConfirmedDesc'),
      });
      return;
    }

    setLoadingActions(prev => ({ ...prev, [reservationId]: true }));

    // Optimistic update
    setTodayEvents(prev =>
      prev.map(e => e.id === reservationId ? { ...e, status: 'confirmed' } : e)
    );

    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: t('provider.dashboard.agenda.success'),
        description: t('provider.dashboard.agenda.pickupConfirmed'),
      });

      await fetchDashboardData();
    } catch (error) {
      console.error('Error confirming pickup:', error);

      // Rollback optimistic update
      setTodayEvents(prev =>
        prev.map(e => e.id === reservationId ? { ...e, status: event?.status || 'hold' } : e)
      );

      toast({
        title: t('error'),
        description: t('provider.dashboard.agenda.errorConfirming'),
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const handleReschedule = (reservationId: string) => {
    // Navigate to reservations page with this reservation selected
    // For now, just navigate to reservations list
    navigate(`/provider/reservations?highlight=${reservationId}`);
  };

  const handleReportDamage = (reservationId: string) => {
    // For now, navigate to reservations page
    // Future: open damage report modal
    navigate(`/provider/reservations?damage=${reservationId}`);
  };

  const handleMarkReturned = (reservationId: string) => {
    const event = todayEvents.find(e => e.id === reservationId);
    if (!event) return;

    // Show confirmation dialog with condition selector
    setEventToReturn(event);
    setReturnCondition('good');
    setReturnNotes('');
    setReturnDialogOpen(true);
  };

  const confirmMarkReturned = async () => {
    if (!eventToReturn) return;

    setLoadingActions(prev => ({ ...prev, [eventToReturn.id]: true }));
    setReturnDialogOpen(false);

    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'completed',
          actual_return_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: returnNotes ? `${eventToReturn.notes || ''}\n\nVráceno (${returnCondition}): ${returnNotes}`.trim() : eventToReturn.notes
        })
        .eq('id', eventToReturn.id);

      if (error) throw error;

      toast({
        title: t('provider.dashboard.agenda.success'),
        description: t('provider.dashboard.agenda.markedAsReturned'),
      });

      // Remove from today's events
      setTodayEvents(prev => prev.filter(e => e.id !== eventToReturn.id));
      await fetchDashboardData();
    } catch (error) {
      console.error('Error marking as returned:', error);
      toast({
        title: t('error'),
        description: t('provider.dashboard.agenda.errorMarkingReturned'),
        variant: 'destructive',
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [eventToReturn.id]: false }));
      setEventToReturn(null);
      setReturnNotes('');
    }
  };

  const completedTasks = Object.values(checklist).filter(Boolean).length;
  const totalTasks = Object.keys(checklist).length;
  const progressPercent = (completedTasks / totalTasks) * 100;
  const formattedToday = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  if (loading) {
    return (
      <ProviderLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  // Empty State - No Data
  if (stats.totalItems === 0) {
    return (
      <ProviderLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {t('provider.dashboard.empty.welcome', { name: provider?.rental_name || user?.email })}
          </h1>
          <p className="text-muted-foreground mb-8">{t('provider.dashboard.empty.subtitle')}</p>

          {/* Main CTA Card */}
          <Card className="mb-8 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('provider.dashboard.empty.ctaTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('provider.dashboard.empty.ctaDescription')}
              </p>
              <div className="flex gap-3">
                <Button variant="primary" asChild>
                  <Link to="/provider/inventory/new">
                    <Package className="w-4 h-4 mr-2" />
                    {t('provider.dashboard.empty.ctaAdd')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/provider/inventory/import">
                    {t('provider.dashboard.empty.ctaImport')}
                  </Link>
                </Button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  {t('provider.dashboard.empty.tutorial')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Setup Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('provider.dashboard.empty.checklistTitle', {
                  completed: completedTasks,
                  total: totalTasks
                })}
              </CardTitle>
              <Progress value={progressPercent} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <ChecklistItem
                completed={checklist.profileCreated}
                labelKey="provider.dashboard.empty.profile"
              />
              <ChecklistItem
                completed={checklist.firstItemAdded}
                labelKey="provider.dashboard.empty.firstItem"
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/provider/inventory/new">{t('provider.dashboard.empty.ctaAdd')}</Link>
                  </Button>
                }
              />
              <ChecklistItem
                completed={checklist.testReservation}
                labelKey="provider.dashboard.empty.testReservation"
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/provider/reservations/new">{t('provider.dashboard.empty.create')}</Link>
                  </Button>
                }
              />
              <ChecklistItem
                completed={checklist.teamInvited}
                labelKey="provider.dashboard.empty.team"
                action={
                  <Button variant="ghost" size="sm" disabled>
                    {t('provider.dashboard.empty.comingSoon')}
                  </Button>
                }
              />
              <ChecklistItem
                completed={checklist.pricingConfigured}
                labelKey="provider.dashboard.empty.pricing"
                action={
                  <Button variant="ghost" size="sm" disabled>
                    {t('provider.dashboard.empty.comingSoon')}
                  </Button>
                }
              />
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link to="/provider/settings">{t('provider.dashboard.empty.continueSetup')}</Link>
            </Button>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  // Filled State - With Data
  return (
    <ProviderLayout>
      <div className="space-y-6">
      <div>
          <h1 className="text-3xl font-bold mb-2">{t('provider.dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('provider.dashboard.todayLabel', { date: formattedToday })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            titleKey="provider.dashboard.stats.pickups"
            value={stats.todayPickups}
            subtitleKey="provider.dashboard.stats.today"
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            titleKey="provider.dashboard.stats.returns"
            value={stats.todayReturns}
            subtitleKey="provider.dashboard.stats.today"
            color="green"
          />
          <StatCard
            icon={<Package className="w-5 h-5" />}
            titleKey="provider.dashboard.stats.available"
            value={`${stats.availableItems}/${stats.totalItems}`}
            subtitleKey="provider.dashboard.stats.items"
            color="purple"
          />
        </div>

        {/* Today's Agenda */}
        <Card>
          <CardHeader>
            <CardTitle>{t('provider.dashboard.agenda.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('provider.dashboard.agenda.empty')}</p>
                <Button variant="ghost" asChild className="mt-2">
                  <Link to="/provider/reservations">{t('provider.dashboard.agenda.viewAll')}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    onConfirmPickup={handleConfirmPickup}
                    onReschedule={handleReschedule}
                    onMarkReturned={handleMarkReturned}
                    onReportDamage={handleReportDamage}
                    isLoading={loadingActions[event.id] || false}
                  />
                ))}
                <div className="pt-2 text-center">
                  <Button variant="ghost" asChild>
                    <Link to="/provider/reservations">{t('provider.dashboard.agenda.viewAll')}</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle>{t('provider.dashboard.upcoming.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{t('provider.dashboard.upcoming.reservations', { count: stats.activeReservations })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{t('provider.dashboard.upcoming.pending', { count: stats.pendingReservations })}</span>
            </div>
            <Button variant="ghost" asChild className="p-0 mt-4">
              <Link to="/provider/reservations">{t('provider.dashboard.upcoming.viewAll')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mark as Returned Confirmation Dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Označit jako vráceno</AlertDialogTitle>
            <AlertDialogDescription>
              Potvrďte vrácení vybavení od <strong>{eventToReturn?.customer_name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label className="text-base font-medium">Stav vybavení</Label>
              <RadioGroup
                value={returnCondition}
                onValueChange={(value) => setReturnCondition(value as ReturnCondition)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="good" id="good" />
                  <Label htmlFor="good" className="font-normal cursor-pointer">✅ Bez poškození</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minor" id="minor" />
                  <Label htmlFor="minor" className="font-normal cursor-pointer">⚠️ Drobné opotřebení</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="damaged" id="damaged" />
                  <Label htmlFor="damaged" className="font-normal cursor-pointer">❌ Poškozeno</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="returnNotes">Poznámka (volitelně)</Label>
              <Textarea
                id="returnNotes"
                placeholder="Např. škrábnutí na pravé lyži..."
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Zpět</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkReturned}>
              ✓ Potvrdit vrácení
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProviderLayout>
  );
};

// Helper Components

interface AgendaEventCardProps {
  event: AgendaEvent;
  onConfirmPickup?: (id: string) => void;
  onReschedule?: (id: string) => void;
  onMarkReturned?: (id: string) => void;
  onReportDamage?: (id: string) => void;
  isLoading?: boolean;
}

const AgendaEventCard = ({
  event,
  onConfirmPickup,
  onReschedule,
  onMarkReturned,
  onReportDamage,
  isLoading = false
}: AgendaEventCardProps) => {
  const { t } = useTranslation();

  const formatTime = (time: string | null) => {
    if (!time) return t('provider.dashboard.agenda.anytimeToday');
    return new Date(time).toLocaleTimeString(t('locale'), {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPickup = event.type === 'pickup';
  const Icon = isPickup ? ArrowDownToLine : ArrowUpFromLine;
  const bgColor = isPickup ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  const iconColor = isPickup ? 'text-blue-600' : 'text-green-600';

  return (
    <div className={`border-2 rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-1 ${iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">
              {formatTime(event.time)}
            </span>
            <span className="text-xs text-muted-foreground">
              {event.gear_category}
            </span>
          </div>

          <div className="font-medium">{event.customer_name}</div>

          {event.customer_phone && (
            <a
              href={`tel:${event.customer_phone}`}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
            >
              <Phone className="w-3 h-3" />
              {event.customer_phone}
            </a>
          )}

          <div className="text-sm mt-2">
            <span className="font-medium">{event.gear_name}</span>
          </div>

          {event.notes && (
            <div className="text-xs text-muted-foreground mt-2 italic">
              {event.notes}
            </div>
          )}

          {/* Status Badge */}
          <div className="mt-2">
            <StatusBadge status={event.status} />
          </div>

          {/* Action Buttons - Status-based rendering */}
          <div className="flex gap-2 mt-3">
            {isPickup ? (
              // Pickup actions based on status
              event.status === 'confirmed' ? (
                // Already confirmed - show status and edit option
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 font-medium">✓ {t('provider.dashboard.agenda.alreadyConfirmed')}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReschedule && onReschedule(event.id)}
                  >
                    {t('provider.dashboard.agenda.edit')}
                  </Button>
                </div>
              ) : (
                // Not confirmed yet - show confirm button
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onConfirmPickup && onConfirmPickup(event.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? t('provider.dashboard.agenda.confirming') : t('provider.dashboard.agenda.confirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReschedule && onReschedule(event.id)}
                    disabled={isLoading}
                  >
                    {t('provider.dashboard.agenda.reschedule')}
                  </Button>
                </>
              )
            ) : (
              // Return actions
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onMarkReturned && onMarkReturned(event.id)}
                  disabled={isLoading}
                >
                  {isLoading ? t('provider.dashboard.agenda.processing') : t('provider.dashboard.agenda.markReturned')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReportDamage && onReportDamage(event.id)}
                  disabled={isLoading}
                >
                  {t('provider.dashboard.agenda.reportDamage')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslation();

  const variants: Record<string, { color: string; icon: string; label: string }> = {
    hold: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⏰', label: t('provider.dashboard.status.hold') },
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳', label: t('provider.dashboard.status.pending') },
    confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '✓', label: t('provider.dashboard.status.confirmed') },
    active: { color: 'bg-green-100 text-green-800 border-green-200', icon: '🔄', label: t('provider.dashboard.status.active') },
    completed: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '✅', label: t('provider.dashboard.status.completed') },
    cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: '❌', label: t('provider.dashboard.status.cancelled') }
  };

  const variant = variants[status] || variants.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${variant.color}`}>
      <span>{variant.icon}</span>
      <span>{variant.label}</span>
    </span>
  );
};

interface ChecklistItemProps {
  completed: boolean;
  labelKey: string;
  action?: React.ReactNode;
}

const ChecklistItem = ({ completed, labelKey, action }: ChecklistItemProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {completed ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
        )}
        <span className={completed ? 'line-through text-muted-foreground' : ''}>
          {t(labelKey)}
        </span>
      </div>
      {!completed && action}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  titleKey: string;
  value: number | string;
  subtitleKey: string;
  color: 'blue' | 'green' | 'purple';
}

const StatCard = ({ icon, titleKey, value, subtitleKey, color }: StatCardProps) => {
  const { t } = useTranslation();
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <Card className={`border-2 ${colorClasses[color]}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <span className="text-sm font-medium">{t(titleKey)}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{t(subtitleKey)}</div>
      </CardContent>
    </Card>
  );
};

export default DashboardOverview;
