
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// --- Types ---

interface DashboardKPIs {
  todayPickups: number;
  todayReturns: number;
  overdueCount: number;
  overdueExposure: number; // e.g. estimated value or deposit
  capacityRiskCount: number; // items with >90% utilization tomorrow
}

interface AgendaItem {
  id: string;
  type: 'pickup' | 'return';
  time: string | null; // start_date for pickup, end_date for return
  customer: {
    name: string;
    phone: string | null;
  };
  gear: {
    name: string;
    count: number;
  };
  status: string;
  notes: string | null;
}

interface AlertItem {
  id: string;
  type: 'approval' | 'overdue' | 'conflict';
  title: string; // "Žádost o rezervaci", "Po splatnosti"
  description: string; // Customer name, or "2 dny po vrácení"
  severity: 'high' | 'medium' | 'low';
  date: string;
}

// Helper type for Supabase query results
interface DbReservation {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  customer_name: string;
  customer_phone: string | null;
  gear?: { name: string } | null;
}

interface KpiCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}

// --- Component ---

const DashboardOverview = () => {
  const { user, provider } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);

  // Data State
  const [kpis, setKpis] = useState<DashboardKPIs>({
    todayPickups: 0,
    todayReturns: 0,
    overdueCount: 0,
    overdueExposure: 0,
    capacityRiskCount: 0,
  });
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Action State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!provider?.id) return;
    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString();

      // 1. Fetch KPIs
      // Pickups Today: confirmed + start_date == today
      const { count: pickCount } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', provider.id)
        .eq('status', 'confirmed')
        .gte('start_date', todayIso)
        .lt('start_date', tomorrowIso);

      // Returns Today: checked_out/active + end_date == today
      const { count: returnCount } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', provider.id)
        .in('status', ['checked_out', 'active']) // Handle legacy 'active'
        .gte('end_date', todayIso)
        .lt('end_date', tomorrowIso);

      // Overdue: checked_out/active + end_date < today
      const { count: overCount } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', provider.id)
        .in('status', ['checked_out', 'active'])
        .lt('end_date', todayIso);

      // Capacity Risk (simplified): Count items fully booked tomorrow
      // This is complex, for now we will just count active reservations for tomorrow
      // TODO: Implement precise availability calculation
      const { count: riskCount } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', provider.id)
        .in('status', ['confirmed', 'checked_out', 'active'])
        .gte('start_date', tomorrowIso)
        .lt('start_date', new Date(tomorrow.getTime() + 86400000).toISOString());


      setKpis({
        todayPickups: pickCount || 0,
        todayReturns: returnCount || 0,
        overdueCount: overCount || 0,
        overdueExposure: 0, // Placeholder
        capacityRiskCount: riskCount || 0,
      });

      // 2. Fetch Agenda (Pickups & Returns Today)
      const { data: pickupData } = await supabase
        .from('reservations')
        .select(`
          id, start_date, status, notes,
          customer_name, customer_phone,
          gear:gear_id ( name )
        `)
        .eq('provider_id', provider.id)
        .eq('status', 'confirmed')
        .gte('start_date', todayIso)
        .lt('start_date', tomorrowIso)
        .order('start_date', { ascending: true })
        .returns<DbReservation[]>();

      const { data: returnData } = await supabase
        .from('reservations')
        .select(`
          id, end_date, status, notes,
          customer_name, customer_phone,
          gear:gear_id ( name )
        `)
        .eq('provider_id', provider.id)
        .in('status', ['checked_out', 'active'])
        .gte('end_date', todayIso)
        .lt('end_date', tomorrowIso)
        .order('end_date', { ascending: true })
        .returns<DbReservation[]>();

      const agendaItems: AgendaItem[] = [];

      pickupData?.forEach((r: DbReservation) => {
        agendaItems.push({
          id: r.id,
          type: 'pickup',
          time: r.start_date,
          customer: { name: r.customer_name, phone: r.customer_phone },
          gear: { name: r.gear?.name || 'Unknown', count: 1 },
          status: r.status,
          notes: r.notes
        });
      });

      returnData?.forEach((r: DbReservation) => {
        agendaItems.push({
          id: r.id,
          type: 'return',
          time: r.end_date,
          customer: { name: r.customer_name, phone: r.customer_phone },
          gear: { name: r.gear?.name || 'Unknown', count: 1 },
          status: r.status,
          notes: r.notes
        });
      });

      // Sort chronological
      agendaItems.sort((a, b) => new Date(a.time || '').getTime() - new Date(b.time || '').getTime());
      setAgenda(agendaItems);

      // 3. Fetch Alerts (Pending Approvals & Overdue Details)
      const { data: pendingData } = await supabase
        .from('reservations')
        .select(`
          id, start_date, end_date, status, notes,
          customer_name, customer_phone,
          gear:gear_id ( name )
        `)
        .eq('provider_id', provider.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5)
        .returns<DbReservation[]>();

      const { data: overdueData } = await supabase
        .from('reservations')
        .select(`
          id, start_date, end_date, status, notes,
          customer_name, customer_phone,
          gear:gear_id ( name )
        `)
        .eq('provider_id', provider.id)
        .in('status', ['checked_out', 'active'])
        .lt('end_date', todayIso)
        .order('end_date', { ascending: true })
        .limit(5)
        .returns<DbReservation[]>();

      const alertItems: AlertItem[] = [];

      overdueData?.forEach((r: DbReservation) => {
        alertItems.push({
          id: r.id,
          type: 'overdue',
          title: 'Po splatnosti',
          description: `${r.customer_name} - ${r.gear?.name}`,
          severity: 'high',
          date: r.end_date
        });
      });

      pendingData?.forEach((r: DbReservation) => {
        alertItems.push({
          id: r.id,
          type: 'approval',
          title: 'Nová rezervace',
          description: `${r.customer_name} - ${r.gear?.name}`,
          severity: 'medium',
          date: r.start_date
        });
      });

      setAlerts(alertItems);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Nepodařilo se načíst data dashboardu');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [provider?.id]);

  useEffect(() => {
    fetchDashboardData();
    return () => { isMountedRef.current = false; };
  }, [fetchDashboardData]);


  // --- Actions ---

  const handleCheckOut = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'checked_out', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Vybavení bylo vydáno (Checked Out)');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
      toast.error('Chyba při vydávání');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReturnDialog = (item: AgendaItem) => {
    setSelectedItem(item);
    setReturnDialogOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedItem) return;
    setProcessingId(selectedItem.id);
    setReturnDialogOpen(false);

    try {
      const { error } = await supabase
        .from('reservations')
        // We assume 'returned' allows for next step 'inspection'
        // For simplicity in this iteration, we set to 'returned'
        .update({
          status: 'returned',
          actual_return_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;
      toast.success('Vybavení přijato (Returned)');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
      toast.error('Chyba při vracení');
    } finally {
      setProcessingId(null);
      setSelectedItem(null);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Rezervace schválena');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
      toast.error('Chyba při schvalování');
    } finally {
      setProcessingId(null);
    }
  };


  // --- Rendering ---

  // Helper to format time
  const formatTime = (iso: string | null) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  }


  if (loading) {
    return <ProviderLayout><div className="p-8">Načítám dashboard...</div></ProviderLayout>;
  }

  return (
    <ProviderLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Přehled</h1>
            <p className="text-muted-foreground">Operační panel pro {new Date().toLocaleDateString('cs-CZ')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDashboardData}>
              <LayoutDashboard className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* 1. KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="Dnešní Vydání"
            value={kpis.todayPickups}
            icon={<ArrowDownToLine className="w-5 h-5 text-blue-500" />}
            color="border-blue-100 bg-blue-50/20"
          />
          <KpiCard
            title="Dnešní Vrácení"
            value={kpis.todayReturns}
            icon={<ArrowUpFromLine className="w-5 h-5 text-green-500" />}
            color="border-green-100 bg-green-50/20"
          />
          <KpiCard
            title="Po Splatnosti"
            value={kpis.overdueCount}
            subtitle={kpis.overdueExposure > 0 ? `${kpis.overdueExposure} Kč risk` : 'Žádné kritické'}
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            color="border-red-100 bg-red-50/20"
            alert={kpis.overdueCount > 0}
          />
          <KpiCard
            title="Zítřejší Riziko"
            value={kpis.capacityRiskCount}
            subtitle="Položek s >90% obsazeností"
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
            color="border-amber-100 bg-amber-50/20"
          />
        </div>

        {/* 2. Operational Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Agenda (Work Queue) - 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Dnešní Agenda ({agenda.length})
            </h2>

            {agenda.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Žádné plánované akce na dnešek.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {agenda.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                      {/* Time & Type */}
                      <div className="flex items-start gap-4 min-w-[150px]">
                        <div className={`p-2 rounded-full ${item.type === 'pickup' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {item.type === 'pickup' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{formatTime(item.time)}</div>
                          <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
                            {item.type === 'pickup' ? 'Výdej' : 'Příjem'}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="font-medium text-base">{item.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{item.gear.name}</div>
                        {item.customer.phone && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {item.customer.phone}</div>}
                      </div>

                      {/* Action */}
                      <div>
                        {item.type === 'pickup' ? (
                          <Button
                            size="sm"
                            onClick={() => handleCheckOut(item.id)}
                            disabled={processingId === item.id}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                          >
                            {processingId === item.id ? 'Vydávám...' : 'Vydat (Check-out)'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenReturnDialog(item)}
                            disabled={processingId === item.id}
                            variant="outline"
                            className="w-full sm:w-auto border-green-600 text-green-700 hover:bg-green-50"
                          >
                            {processingId === item.id ? 'Zpracuji...' : 'Přijmout (Return)'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Decisions (Alerts) - 1/3 width */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Vyžaduje pozornost ({alerts.length})
            </h2>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <Card className="bg-gray-50 border-none">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Vše vyřešeno. Žádné urgentní události.
                  </CardContent>
                </Card>
              ) : (
                alerts.map(alert => (
                  <Card key={alert.id} className={`border-l-4 ${alert.severity === 'high' ? 'border-l-red-500' : 'border-l-amber-400'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={alert.severity === 'high' ? "destructive" : "secondary"}>
                          {alert.title}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(alert.date)}</span>
                      </div>
                      <p className="font-medium mb-1">{alert.description}</p>

                      <div className="mt-3 flex gap-2 justify-end">
                        {alert.type === 'approval' && (
                          <Button size="sm" variant="primary" onClick={() => handleApprove(alert.id)}>Schválit</Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/provider/reservations?id=${alert.id}`}>Detail <ArrowRight className="w-3 h-3 ml-1" /></Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Quick Links / Context */}
            <Card className="mt-8 bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rychlá akce</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start w-full" asChild>
                  <Link to="/provider/reservations/new">+ Nová Rezervace</Link>
                </Button>
                <Button variant="outline" className="justify-start w-full" asChild>
                  <Link to="/provider/inventory">+ Přidat Vybavení</Link>
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>


      {/* Return Confirmation Dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrdit vrácení</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete označit tuto výpůjčku jako vrácenou? <br />
              <strong>{selectedItem?.customer.name} - {selectedItem?.gear.name}</strong>
              <br /><br />
              Položka bude přesunuta do stavu 'Returned' a bude čekat na inspekci.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReturn}>Potvrdit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ProviderLayout>
  );
};

// --- Subcomponents ---

const KpiCard = ({ title, value, subtitle, icon, color, alert }: KpiCardProps) => (
  <Card className={`${color} border shadow-sm ${alert ? 'animate-pulse ring-1 ring-red-400' : ''}`}>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default DashboardOverview;
