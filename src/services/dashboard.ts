/**
 * Dashboard service — data-access layer for provider dashboard.
 *
 * All Supabase queries live here; the hook (useDashboardData) only
 * wires them into React Query and manages optimistic UI.
 */
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { issueGroup, returnGroup } from "@/services/kits";
import type { KpiData, AgendaItemProps, ExceptionItem } from "@/types/dashboard";

// ═══════════════════════════════════════════════════════════════════════════════
// Internal types (data-layer only)
// ═══════════════════════════════════════════════════════════════════════════════

/** Columns selected for every agenda reservation query */
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

interface RpcResponse {
    success: boolean;
    error?: string;
}

interface RawException {
    id: string;
    end_date?: string;
    start_date?: string;
    customer_name: string | null;
    payment_status?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchDashboardKpi(
    providerId: string,
    todayDate: string,
    tomorrowDate: string,
): Promise<KpiData> {
    const [pickupRes, returnsTodayRes, revenueRes] = await Promise.all([
        supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'active'),

        supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .eq('status', 'active')
            .gte('end_date', todayDate)
            .lt('end_date', tomorrowDate),

        supabase
            .from('reservations')
            .select('total_price')
            .eq('provider_id', providerId)
            .eq('status', 'active'),
    ]);

    if (pickupRes.error) throw pickupRes.error;
    if (returnsTodayRes.error) throw returnsTodayRes.error;
    if (revenueRes.error) throw revenueRes.error;

    const calculatedRevenue = revenueRes.data?.reduce(
        (sum, r) => sum + (r.total_price || 0),
        0,
    ) || 0;

    return {
        activeRentals: pickupRes.count || 0,
        returnsToday: returnsTodayRes.count || 0,
        dailyRevenue: calculatedRevenue,
        activeTrend: "+12% this week",
        activeTrendDir: "up",
        returnsTrend: "On schedule",
        returnsTrendDir: "neutral",
        revenueTrend: "+5% vs yesterday",
        revenueTrendDir: "up",
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Agenda
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchAgendaItems(
    providerId: string,
    todayDate: string,
    tomorrowDate: string,
): Promise<AgendaItemProps[]> {
    const [pickupsRes, returnsRes, overdueRes] = await Promise.all([
        // PICKUPS TODAY: start_date in [today, tomorrow) AND pre-issue status
        supabase
            .from('reservations')
            .select(AGENDA_SELECT)
            .eq('provider_id', providerId)
            .in('status', ['pending', 'confirmed', 'hold'])
            .gte('start_date', todayDate)
            .lt('start_date', tomorrowDate)
            .limit(50),

        // RETURNS TODAY: end_date in [today, tomorrow) AND active
        supabase
            .from('reservations')
            .select(AGENDA_SELECT)
            .eq('provider_id', providerId)
            .eq('status', 'active')
            .gte('end_date', todayDate)
            .lt('end_date', tomorrowDate)
            .limit(50),

        // OVERDUE: end_date < today AND still active
        supabase
            .from('reservations')
            .select(AGENDA_SELECT)
            .eq('provider_id', providerId)
            .eq('status', 'active')
            .lt('end_date', todayDate)
            .limit(50),
    ]);

    if (pickupsRes.error) throw pickupsRes.error;
    if (returnsRes.error) throw returnsRes.error;
    if (overdueRes.error) throw overdueRes.error;

    const pickupGroups = new Map<string, AgendaItemProps>();
    const returnGroups = new Map<string, AgendaItemProps>();
    const overdueGroups = new Map<string, AgendaItemProps>();

    const processItem = (
        r: RawAgendaItem,
        type: 'pickup' | 'return' | 'overdue',
        timeFormatStr: string,
        uiStatus: 'ready' | 'unpaid' | 'active' | 'overdue',
        groupsMap: Map<string, AgendaItemProps>,
        timeOverride?: string,
    ) => {
        const riskStatus = r.crm_customer?.risk_status as 'safe' | 'warning' | 'blacklist' | undefined;
        const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
        const timeStr = timeOverride || format(
            new Date((type === 'pickup' ? r.start_date : r.end_date) + 'T00:00:00'),
            timeFormatStr,
        );

        const groupKey = r.group_id || r.id;

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
                reservationId: r.id,
                startDate: r.start_date,
                endDate: r.end_date,
                paymentStatus,
                crmCustomerId: r.crm_customer_id || undefined,
                customerRiskStatus: riskStatus,
                groupId: r.group_id || undefined,
            });
        }
    };

    // Map pickups
    (pickupsRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
        const paymentStatus = (r.payment_status as 'paid' | 'unpaid' | 'deposit_paid') || 'unpaid';
        const uiStatus = ['paid', 'deposit_paid'].includes(paymentStatus) ? 'ready' : 'unpaid';
        processItem(r, 'pickup', 'HH:mm', uiStatus as 'ready' | 'unpaid', pickupGroups);
    });

    // Map returns
    (returnsRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
        processItem(r, 'return', 'HH:mm', 'active', returnGroups);
    });

    // Map overdue
    (overdueRes.data as unknown as RawAgendaItem[] || []).forEach(r => {
        processItem(r, 'overdue', 'd.M.', 'overdue', overdueGroups);
    });

    // Merge all groups into flat list
    const items: AgendaItemProps[] = [];
    pickupGroups.forEach(g => items.push(g));
    returnGroups.forEach(g => items.push(g));
    overdueGroups.forEach(g => items.push(g));

    // Sort: overdue first (by end_date asc), then today items by time
    return items.sort((a, b) => {
        if (a.type === 'overdue' && b.type !== 'overdue') return -1;
        if (a.type !== 'overdue' && b.type === 'overdue') return 1;
        return a.time.localeCompare(b.time);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exceptions
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchExceptions(
    providerId: string,
    todayDate: string,
    tomorrowDate: string,
): Promise<ExceptionItem[]> {
    const [overdueRes, unpaidRes] = await Promise.all([
        // Overdue returns (active + past end_date)
        supabase
            .from('reservations')
            .select('id, end_date, customer_name')
            .eq('provider_id', providerId)
            .eq('status', 'active')
            .lt('end_date', todayDate),

        // Unpaid pickups scheduled for today
        supabase
            .from('reservations')
            .select('id, start_date, customer_name, payment_status')
            .eq('provider_id', providerId)
            .in('status', ['confirmed', 'hold'])
            .eq('payment_status', 'unpaid')
            .gte('start_date', todayDate)
            .lt('start_date', tomorrowDate),
    ]);

    if (overdueRes.error) throw overdueRes.error;
    if (unpaidRes.error) throw unpaidRes.error;

    const exceptions: ExceptionItem[] = [];

    (overdueRes.data as unknown as RawException[] || []).forEach((o) => {
        exceptions.push({
            id: o.id,
            type: 'overdue',
            message: `Overdue since ${format(new Date(o.end_date!), 'd.M.')}`,
            priority: 'high',
            customer: o.customer_name || 'Unknown',
        });
    });

    (unpaidRes.data as unknown as RawException[] || []).forEach((u) => {
        exceptions.push({
            id: u.id,
            type: 'unpaid',
            message: `Pickup today - Payment pending`,
            priority: 'medium',
            customer: u.customer_name || 'Unknown',
        });
    });

    return exceptions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mutations — issue & return
// ═══════════════════════════════════════════════════════════════════════════════

export async function issueReservation(
    id: string,
    providerId: string,
    isOverride: boolean,
    groupId?: string,
): Promise<void> {
    if (groupId) {
        await issueGroup(groupId, providerId);
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data, error } = await supabase.rpc('issue_reservation', {
        p_reservation_id: id,
        p_provider_id: providerId,
        p_user_id: user.id,
        p_override: isOverride,
    });

    if (error) throw error;

    const res = data as unknown as RpcResponse;
    if (res && !res.success) {
        throw new Error(res.error || 'Issue failed');
    }
}

export async function processReturn(
    id: string,
    providerId: string,
    hasDamage: boolean,
    groupId?: string,
): Promise<void> {
    if (groupId) {
        await returnGroup(groupId, providerId);
        return;
    }

    const { data, error } = await supabase.rpc('process_return', {
        p_reservation_id: id,
        p_has_damage: hasDamage,
    });

    if (error) throw error;

    const res = data as unknown as RpcResponse;
    if (res && !res.success) {
        throw new Error(res.error || 'Return failed');
    }
}
