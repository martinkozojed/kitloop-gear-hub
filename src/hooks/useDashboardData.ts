import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { AgendaItemProps, DashboardReservation, KpiData } from "@/types/dashboard";
import { ExceptionItem } from "@/types/dashboard";
import { toast } from "sonner";

interface RpcResponse {
    success: boolean;
    error?: string;
}

export const useDashboardData = () => {
    const { provider, logout } = useAuth();
    const queryClient = useQueryClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString();

    // --- QUERIES ---

    // 1. KPI Query
    const kpiQuery = useQuery({
        queryKey: ['dashboard', 'kpi', provider?.id],
        queryFn: async (): Promise<KpiData> => {
            if (!provider?.id) throw new Error("No provider");

            const { count: pickupCount } = await supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('provider_id', provider.id)
                .eq('status', 'active');

            const { count: returnsTodayCount } = await supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('provider_id', provider.id)
                .eq('status', 'active')
                .gte('end_date', todayIso)
                .lt('end_date', tomorrowIso);

            // Calculate daily revenue from active reservations
            const { data: activeReservations } = await supabase
                .from('reservations')
                .select('total_price')
                .eq('provider_id', provider.id)
                .eq('status', 'active');

            const calculatedRevenue = activeReservations?.reduce(
                (sum, r) => sum + (r.total_price || 0),
                0
            ) || 0;

            return {
                activeRentals: pickupCount || 0,
                returnsToday: returnsTodayCount || 0,
                dailyRevenue: calculatedRevenue,
                activeTrend: "+12% this week",
                activeTrendDir: "up",
                returnsTrend: "On schedule",
                returnsTrendDir: "neutral",
                revenueTrend: "+5% vs yesterday",
                revenueTrendDir: "up"
            };
        },
        enabled: !!provider?.id,
        staleTime: 1000 * 60 * 1, // 1 minute stale
    });

    // 2. Agenda Query
    const agendaQuery = useQuery({
        queryKey: ['dashboard', 'agenda', provider?.id],
        queryFn: async (): Promise<AgendaItemProps[]> => {
            if (!provider?.id) throw new Error("No provider");

            const { data: rawAgenda, error } = await supabase
                .from('reservations')
                .select(`
                    id, start_date, end_date, status, customer_name, customer_phone, payment_status, crm_customer_id,
                    gear:gear_id ( name ),
                    crm_customer:customers ( risk_status )
                `)
                .eq('provider_id', provider.id)
                .in('status', ['hold', 'confirmed', 'active', 'completed'])
                .or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`)
                .limit(50);

            if (error) throw error;

            // Define specific type for the raw query result
            interface RawAgendaItem {
                id: string;
                start_date: string;
                end_date: string;
                status: string;
                customer_name: string | null;
                customer_phone: string | null;
                payment_status: string;
                crm_customer_id: string | null;
                gear: { name: string } | null;
                crm_customer: { risk_status: string } | null;
            }

            const mappedAgenda: AgendaItemProps[] = [];

            (rawAgenda as unknown as RawAgendaItem[])?.forEach((r) => {
                const sDate = new Date(r.start_date);
                const eDate = new Date(r.end_date);
                const isTodayStart = sDate >= today && sDate < tomorrow;
                const isTodayEnd = eDate >= today && eDate < tomorrow;

                const riskStatus = r.crm_customer?.risk_status as 'safe' | 'warning' | 'blacklist' | undefined;

                // Pickup Agenda
                if (isTodayStart && (r.status === 'confirmed' || r.status === 'hold')) {
                    const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
                    const uiStatus = ['paid', 'deposit_paid'].includes(paymentStatus) ? 'ready' : 'unpaid';

                    mappedAgenda.push({
                        time: format(sDate, 'HH:mm'),
                        type: 'pickup',
                        customerName: r.customer_name || 'Unknown',
                        itemCount: 1, // Placeholder
                        status: uiStatus as 'ready' | 'unpaid',
                        reservationId: r.id,
                        startDate: r.start_date,
                        endDate: r.end_date,
                        paymentStatus,
                        crmCustomerId: r.crm_customer_id || undefined,
                        customerRiskStatus: riskStatus
                    });
                }

                // Return Agenda
                if (isTodayEnd && ['active', 'completed'].includes(r.status)) {
                    const isReturned = r.status === 'completed';
                    const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
                    mappedAgenda.push({
                        time: format(eDate, 'HH:mm'),
                        type: 'return',
                        customerName: r.customer_name || 'Unknown',
                        itemCount: 1, // Placeholder
                        status: isReturned ? 'completed' : 'active',
                        reservationId: r.id,
                        startDate: r.start_date,
                        endDate: r.end_date,
                        paymentStatus
                    });
                }
            });

            return mappedAgenda.sort((a, b) => a.time.localeCompare(b.time));
        },
        enabled: !!provider?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes stale for agenda
    });

    // 3. Exceptions Query
    const exceptionsQuery = useQuery({
        queryKey: ['dashboard', 'exceptions', provider?.id],
        queryFn: async (): Promise<ExceptionItem[]> => {
            if (!provider?.id) throw new Error("No provider");

            // Query 1: Overdue returns
            const { data: overdueData } = await supabase
                .from('reservations')
                .select('id, end_date, customer_name')
                .eq('provider_id', provider.id)
                .in('status', ['active']) // only active items can be overdue
                .lt('end_date', todayIso);

            // Query 2: Unpaid pickups scheduled for today
            const { data: unpaidData } = await supabase
                .from('reservations')
                .select('id, start_date, customer_name, payment_status')
                .eq('provider_id', provider.id)
                .in('status', ['confirmed', 'hold'])
                .eq('payment_status', 'unpaid')
                .gte('start_date', todayIso)
                .lt('start_date', tomorrowIso);

            interface RawException {
                id: string;
                end_date?: string;
                start_date?: string;
                customer_name: string | null;
                payment_status?: string;
            }

            const exceptions: ExceptionItem[] = [];

            // Add overdue items (high priority)
            (overdueData as unknown as RawException[] || []).forEach((o) => {
                exceptions.push({
                    id: o.id,
                    type: 'overdue',
                    message: `Overdue since ${format(new Date(o.end_date!), 'd.M.')}`,
                    priority: 'high',
                    customer: o.customer_name || 'Unknown'
                });
            });

            // Add unpaid items (medium priority)
            (unpaidData as unknown as RawException[] || []).forEach((u) => {
                exceptions.push({
                    id: u.id,
                    type: 'unpaid',
                    message: `Pickup today - Payment pending`,
                    priority: 'medium',
                    customer: u.customer_name || 'Unknown'
                });
            });

            return exceptions;
        },
        enabled: !!provider?.id,
    });


    // --- MUTATIONS (Optimistic UI) ---

    const issueMutation = useMutation({
        mutationFn: async ({ id, isOverride }: { id: string; isOverride: boolean }) => {
            if (!provider?.id) throw new Error("Missing provider ID");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user");

            const { data, error } = await supabase.rpc('issue_reservation', {
                p_reservation_id: id,
                p_provider_id: provider.id,
                p_user_id: user.id,
                p_override: isOverride
            });

            if (error) throw error;
            const res = data as unknown as RpcResponse;
            if (res && !res.success) {
                throw new Error(res.error || 'Issue failed');
            }
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id]);

            // Optimistically update
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                // Find the item and remove it from 'pickup' lists if it was a pickup, 
                // OR technically it doesn't disappear if its a return day same day.
                // For "Today's Agenda", a Pickup becomes Active. 
                // However, our Agenda logic only shows pickups if 'confirmed'/'unpaid'.
                // So if we change status to 'checked_out', it should DISAPPEAR from Pickup view.
                // If it's returning today, it should APPEAR in Return view.

                // Simplified Optimistic Logic: Remove from list to simulate "Done"
                return old.filter(item => item.reservationId !== id);
            });

            return { previousAgenda };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id], context?.previousAgenda);
            toast.error("Issue failed - reverting");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const returnMutation = useMutation({
        mutationFn: async ({ id, damage }: { id: string; damage: boolean }) => {
            const { data, error } = await supabase
                .rpc('process_return', {
                    p_reservation_id: id,
                    p_has_damage: damage
                });

            if (error) throw error;
            const res = data as unknown as RpcResponse;
            if (res && !res.success) {
                throw new Error(res.error || 'Return failed');
            }
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id]);

            queryClient.setQueryData(['dashboard', 'agenda', provider?.id], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                // Update the item status to 'completed' so the pill changes color instantly
                return old.map(item =>
                    item.reservationId === id ? { ...item, status: 'completed' } : item
                );
            });

            return { previousAgenda };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id], context?.previousAgenda);
            toast.error("Return failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
    });

    return {
        // Data
        kpiData: kpiQuery.data || { activeRentals: 0, returnsToday: 0, dailyRevenue: 0 },
        agendaItems: agendaQuery.data || [],
        exceptions: exceptionsQuery.data || [],
        isLoading: kpiQuery.isLoading || agendaQuery.isLoading,
        isError: kpiQuery.isError || agendaQuery.isError,

        // Actions
        issueReservation: issueMutation.mutateAsync,
        returnReservation: returnMutation.mutateAsync,
        refresh: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        isSyncing: queryClient.isFetching() > 0 || queryClient.isMutating() > 0
    };
};
