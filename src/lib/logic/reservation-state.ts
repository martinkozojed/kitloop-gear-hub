
export type ReservationStatus =
    | 'pending'    // Created, awaiting confirmation/payment
    | 'confirmed'  // Payment active, waiting for pickup date
    | 'active'     // Picked up (Vydano)
    | 'completed'  // Returned (Vraceno) - Success state
    | 'cancelled'  // Cancelled before pickup
    | 'maintenance'// Internal block for repair
    | 'expired';   // Auto-cancelled after timeout

export type PaymentStatus =
    | 'unpaid'
    | 'paid'
    | 'failed'
    | 'refunded';

export interface ReservationState {
    status: ReservationStatus;
    paymentStatus: PaymentStatus;
    startDate: string; // ISO
    endDate: string;   // ISO
}

export interface ItemState {
    id: string;
    status: 'available' | 'reserved' | 'active' | 'maintenance';
}

/**
 * Validates if a reservation is eligible for "Issue" (Check-out)
 * 30-Second Rule: Must not require complex thinking.
 */
export const canIssue = (
    reservation: ReservationState,
    items: ItemState[],
    override: boolean = false
): boolean => {
    // 1. Must be confirmed
    if (reservation.status !== 'confirmed') return false;

    // 2. Must be paid (Biggest blocker)
    if (reservation.paymentStatus !== 'paid' && !override) return false;

    // 3. All items must be eligible (Available or Reserved for this)
    const allItemsReady = items.every(i =>
        i.status === 'available' || i.status === 'reserved'
    );
    if (!allItemsReady) return false;

    return true;
};

/**
 * Derived state: Is this reservation overdue?
 */
export const isOverdue = (reservation: ReservationState): boolean => {
    const now = new Date();
    const end = new Date(reservation.endDate);

    if (reservation.status !== 'active') return false;
    return now > end;
};

/**
 * Returns the correct strict semantic color for a status.
 * Accepts any string; unknown statuses return 'secondary' (never throws).
 * Prefer getBadgeVariant from status-colors.ts for new call sites.
 */
export const getStatusColor = (status: string): "default" | "success" | "warning" | "destructive" | "secondary" => {
    switch (status) {
        case 'confirmed': return 'secondary';
        case 'active':
        case 'checked_out': return 'default';
        case 'completed':
        case 'returned':
        case 'inspected_closed': return 'success';
        case 'cancelled':
        case 'maintenance': return 'secondary';
        case 'expired':
        case 'no_show': return 'destructive';
        case 'pending':
        case 'hold':
        case 'unpaid': return 'warning';
        default: return 'secondary';
    }
};
