export type ReservationStatus =
    | 'pending'
    | 'confirmed'
    | 'active'
    | 'checked_out'
    | 'returned'
    | 'completed'
    | 'cancelled'
    | 'unpaid'
    | 'conflict';

export interface DashboardReservation {
    id: string;
    start_date: string;
    end_date: string;
    status: ReservationStatus;
    customer_name: string;
    customer_phone?: string;
    payment_status: 'paid' | 'unpaid' | 'refunded';
    gear?: {
        name: string;
    } | null;
}

export interface KpiData {
    activeRentals: number;
    returnsToday: number;
    dailyRevenue: number;
    activeTrend?: string;
    activeTrendDir?: 'up' | 'down' | 'neutral';
    returnsTrend?: string;
    returnsTrendDir?: 'up' | 'down' | 'neutral';
    revenueTrend?: string;
    revenueTrendDir?: 'up' | 'down' | 'neutral';
}

export interface AgendaItemProps {
    time: string;
    type: 'pickup' | 'return';
    customerName: string;
    itemCount: number;
    status: 'ready' | 'conflict' | 'unpaid' | 'active' | 'returned';
    reservationId: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
}
