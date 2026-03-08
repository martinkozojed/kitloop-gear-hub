import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { getProviderTodayDates } from "@/lib/provider-dates";
import { AgendaItemProps, KpiData } from "@/types/dashboard";
import { ExceptionItem } from "@/types/dashboard";
import { toast } from "sonner";
import { issueGroup, returnGroup } from "@/services/kits";

interface RpcResponse {
    success: boolean;
    error?: string;
}

/** Shared select columns for agenda reservation queries */
const AGENDA_SELECT = `
    id, start_date, end_date, status, customer_name, customer_phone, payment_status, crm_customer_id, group_id,
    gear:gear_id ( name ),
    crm_customer:customers ( risk_status )
` as const;

interface RawAgendaItem {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    customer_name: string | null;
    customer_phone: string | null;
    payment_status: string;
    crm_customer_id: string | null;
    group_id: string | null;
    gear: { name: string } | null;
    crm_customer: { risk_status: string } | null;
}

export const useDashboardData = () => {
    const { provider, logout } = useAuth();
    const queryClient = useQueryClient();

    // DATE columns in reservations are Postgres DATE type.
    // Use provider timezone to compute correct "today" boundary.
    // Fallback: operator's local clock (F1 pilot default).
    const { todayDate, tomorrowDate } = getProviderTodayDates(provider?.time_zone);

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
                .gte('end_date', todayDate)
                .lt('end_date', tomorrowDate);

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
        staleTime: 1000 * 60 * 1,
    });

    // 2. Agenda Query — 3 SEPARATE server-side queries (no .or(), no client-side filtering)
    const agendaQuery = useQuery({
        queryKey: ['dashboard', 'agenda', provider?.id, todayDate],
        queryFn: async (): Promise<AgendaItemProps[]> => {
            if (!provider?.id) throw new Error("No provider");

            // Fire all 3 queries in parallel
            const [pickupsRes, returnsRes, overdueRes] = await Promise.all([
                // PICKUPS TODAY: start_date in [today, tomorrow) AND pre-issue status
                supabase
                    .from('reservations')
                    .select(AGENDA_SELECT)
                    .eq('provider_id', provider.id)
                    .in('status', ['pending', 'confirmed', 'hold'])
                    .gte('start_date', todayDate)
                    .lt('start_date', tomorrowDate)
                    .limit(50),

                // RETURNS TODAY: end_date in [today, tomorrow) AND active
                supabase
                    .from('reservations')
                    .select(AGENDA_SELECT)
                    .eq('provider_id', provider.id)
                    .eq('status', 'active')
                    .gte('end_date', todayDate)
                    .lt('end_date', tomorrowDate)
                    .limit(50),

                // OVERDUE: end_date < today AND still active (not returned)
                supabase
                    .from('reservations')
                    .select(AGENDA_SELECT)
                    .eq('provider_id', provider.id)
                    .eq('status', 'active')
                    .lt('end_date', todayDate)
                    .limit(50),
            ]);

            if (pickupsRes.error) throw pickupsRes.error;
            if (returnsRes.error) throw returnsRes.error;
            if (overdueRes.error) throw overdueRes.error;

            const items: AgendaItemProps[] = [];
            const pickupGroups = new Map<string, AgendaItemProps>();
            const returnGroups = new Map<string, AgendaItemProps>();
            const overdueGroups = new Map<string, AgendaItemProps>();

            // Helper to handle grouping
            const processItem = (
                r: RawAgendaItem,
                type: 'pickup' | 'return' | 'overdue',
                timeFormatStr: string,
                uiStatus: 'ready' | 'unpaid' | 'active' | 'overdue',
                groupsMap: Map<string, AgendaItemProps>,
                timeOverride?: string
            ) => {
                const riskStatus = r.crm_customer?.risk_status as 'safe' | 'warning' | 'blacklist' | undefined;
                const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
                const timeStr = timeOverride || format(new Date((type === 'pickup' ? r.start_date : r.end_date) + 'T00:00:00'), timeFormatStr);

                const groupKey = r.group_id || r.id;

                // Security assertion: Prevent inadvertent aggregation of NULL group_ids
                if (!r.group_id && groupKey !== r.id) {
                    console.error("Critical: NULL group_id must fallback to unique reservation id to avoid false aggregation");
                }

                const existing = groupsMap.get(groupKey);

                if (existing) {
                    existing.itemCount += 1;
                } else {
                    groupsMap.set(groupKey, {
                        time: timeStr,
                        type,
                        customerName: r.customer_name || 'Unknown',
                        itemCount: 1,
                        status: uiStatus,
                        reservationId: r.id, // using first item's ID, operations will use groupId if present
                        startDate: r.start_date,
                        endDate: r.end_date,
                        paymentStatus,
                        crmCustomerId: r.crm_customer_id || undefined,
                        customerRiskStatus: riskStatus,
                        groupId: r.group_id || undefined,
                    });
                }
            };

            // --- Map pickups (server already filtered: correct status + date range) ---
            (pickupsRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
                const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
                const uiStatus = ['paid', 'deposit_paid'].includes(paymentStatus) ? 'ready' : 'unpaid';
                processItem(r, 'pickup', 'HH:mm', uiStatus as 'ready' | 'unpaid', pickupGroups);
            });

            // --- Map returns (server already filtered: active + end_date today) ---
            (returnsRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
                processItem(r, 'return', 'HH:mm', 'active', returnGroups);
            });

            // --- Map overdue (server already filtered: active + end_date < today) ---
            (overdueRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
                processItem(r, 'overdue', 'd.M.', 'overdue', overdueGroups);
            });

            // Add grouped items to the main items array
            pickupGroups.forEach(g => items.push(g));
            returnGroups.forEach(g => items.push(g));
            overdueGroups.forEach(g => items.push(g));

            // Sort: overdue first (by end_date asc), then today items by time
            return items.sort((a, b) => {
                if (a.type === 'overdue' && b.type !== 'overdue') return -1;
                if (a.type !== 'overdue' && b.type === 'overdue') return 1;
                return a.time.localeCompare(b.time);
            });
        },
        enabled: !!provider?.id,
        staleTime: 1000 * 60 * 5,
    });

    // 3. Exceptions Query (already server-side, no changes needed)
    const exceptionsQuery = useQuery({
        queryKey: ['dashboard', 'exceptions', provider?.id, todayDate],
        queryFn: async (): Promise<ExceptionItem[]> => {
            if (!provider?.id) throw new Error("No provider");

            // Query 1: Overdue returns (active + past end_date)
            const { data: overdueData } = await supabase
                .from('reservations')
                .select('id, end_date, customer_name')
                .eq('provider_id', provider.id)
                .eq('status', 'active')
                .lt('end_date', todayDate);

            // Query 2: Unpaid pickups scheduled for today
            const { data: unpaidData } = await supabase
                .from('reservations')
                .select('id, start_date, customer_name, payment_status')
                .eq('provider_id', provider.id)
                .in('status', ['confirmed', 'hold'])
                .eq('payment_status', 'unpaid')
                .gte('start_date', todayDate)
                .lt('start_date', tomorrowDate);

            interface RawException {
                id: string;
                end_date?: string;
                start_date?: string;
                customer_name: string | null;
                payment_status?: string;
            }

            const exceptions: ExceptionItem[] = [];

            (overdueData as unknown as RawException[] || []).forEach((o) => {
                exceptions.push({
                    id: o.id,
                    type: 'overdue',
                    message: `Overdue since ${format(new Date(o.end_date!), 'd.M.')}`,
                    priority: 'high',
                    customer: o.customer_name || 'Unknown'
                });
            });

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
        mutationFn: async ({ id, isOverride, groupId }: { id: string; isOverride: boolean; groupId?: string }) => {
            if (!provider?.id) throw new Error("Missing provider ID");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user");

            if (groupId) {
                // Batch operation for kit
                await issueGroup(groupId, provider.id);
                return;
            }

            // Single reservation operation
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
        onMutate: async ({ id, groupId }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id, todayDate]);

            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                if (groupId) {
                    return old.filter(item => item.groupId !== groupId);
                }
                return old.filter(item => item.reservationId !== id);
            });

            return { previousAgenda };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], context?.previousAgenda);
            toast.error("Issue failed - reverting");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const returnMutation = useMutation({
        mutationFn: async ({ id, damage, groupId }: { id: string; damage: boolean; groupId?: string }) => {
            if (groupId) {
                if (!provider?.id) throw new Error("Missing provider ID");
                // Batch operation for kit
                await returnGroup(groupId, provider.id);
                return;
            }

            // Single reservation operation
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
        onMutate: async ({ id, groupId }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id, todayDate]);

            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                return old.map(item => {
                    if (groupId && item.groupId === groupId) return { ...item, status: 'completed' };
                    if (!groupId && item.reservationId === id) return { ...item, status: 'completed' };
                    return item;
                });
            });

            return { previousAgenda };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], context?.previousAgenda);
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
