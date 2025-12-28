// Status for UI pills in the dashboard
export type DashboardStatus =
    | 'pending'
    | 'confirmed'
    | 'active'    // Was checked_out
    | 'completed' // Was returned
    | 'cancelled'
    | 'expired';

export interface DashboardReservation {
    id: string;
    customer_name: string;
    start_date: string;
    end_date: string;
    status: DashboardStatus;
    items: string[];
}

export interface KpiData {
    activeRentals: number;
    returnsToday: number;
    dailyRevenue: number;
    // Trends for UI (optional)
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
    status: 'ready' | 'conflict' | 'unpaid' | 'active' | 'completed'; // UI state for the agenda row
    reservationId: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: 'paid' | 'unpaid' | 'deposit_paid';
    crmCustomerId?: string;
    customerRiskStatus?: 'safe' | 'warning' | 'blacklist';
}

export interface ExceptionItem {
    id: string;
    type: 'overdue' | 'unpaid';
    message: string;
    priority: 'high' | 'medium';
    customer: string;
}
