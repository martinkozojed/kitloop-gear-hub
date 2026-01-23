/**
 * Status Color Utilities
 * Provides consistent color classes for reservation statuses
 * Uses design tokens from index.css
 * 
 * SINGLE SOURCE OF TRUTH for reservation status visualization
 */

export type ReservationStatus =
  | 'hold'
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'ready'
  | 'unpaid'
  | 'conflict';

// Matches Badge variants
export type SemanticVariant = 'warning' | 'info' | 'success' | 'destructive' | 'secondary' | 'default';

/**
 * Returns the matching Badge variant for a reservation status.
 * Use this with <Badge variant={getBadgeVariant(status)}>
 */
export function getBadgeVariant(status: ReservationStatus): SemanticVariant {
  switch (status) {
    case 'hold':
    case 'pending':
    case 'unpaid':
      return 'warning';

    case 'confirmed':
    case 'active':
      return 'info'; // Blue

    case 'ready':
      return 'success';

    case 'overdue':
    case 'conflict':
      return 'destructive'; // Red

    case 'completed':
    case 'cancelled':
      return 'secondary'; // Gray/Muted

    default:
      return 'secondary';
  }
}

/**
 * Central mapping of status to semantic intent (Internal logic)
 */
export function getSemanticVariant(status: ReservationStatus): SemanticVariant {
  return getBadgeVariant(status);
}

/**
 * Returns Tailwind classes for a given status
 * Uses CSS custom properties (design tokens) for consistency
 */
export function getStatusColorClasses(status: ReservationStatus): string {
  switch (status) {
    // Warning: Orange/Amber
    case 'hold':
    case 'pending':
    case 'unpaid':
      return 'bg-status-warning/10 text-status-warning border-status-warning/20';

    // Info: Blue (confirmed, active)
    case 'confirmed':
    case 'active':
      return 'bg-status-info/10 text-status-info border-status-info/20';

    // Success: Green (ready for pickup)
    case 'ready':
      return 'bg-status-success/10 text-status-success border-status-success/20';

    // Danger: Red (URGENT only)
    case 'overdue':
    case 'conflict':
      return 'bg-status-danger/10 text-status-danger border-status-danger/20';

    // Neutral: Gray (closed states)
    case 'completed':
    case 'cancelled':
      return 'bg-status-neutral/10 text-status-neutral border-status-neutral/20';

    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Returns i18n key for status label
 * Usage: t(getStatusLabelKey(status))
 */
export function getStatusLabelKey(status: ReservationStatus): string {
  return `provider.dashboard.status.${status}`;
}

/**
 * Fallback: Returns a user-friendly label for status (EN fallback)
 * @deprecated Use getStatusLabelKey with i18n t() function instead
 */
export function getStatusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'hold': return 'Hold';
    case 'pending': return 'Pending';
    case 'confirmed': return 'Confirmed';
    case 'active': return 'Active';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'overdue': return 'Overdue';
    case 'ready': return 'Ready';
    case 'unpaid': return 'Unpaid';
    case 'conflict': return 'Conflict';
    default: return status;
  }
}

/**
 * Returns solid background color for buttons/highlights
 */
export function getStatusSolidClass(status: ReservationStatus): string {
  switch (status) {
    case 'hold':
    case 'pending':
    case 'unpaid':
      return 'bg-status-warning text-white';

    case 'confirmed':
    case 'active':
      return 'bg-status-info text-white';

    case 'ready':
      return 'bg-status-success text-white';

    case 'overdue':
    case 'conflict':
      return 'bg-status-danger text-white';

    case 'completed':
    case 'cancelled':
      return 'bg-status-neutral text-white';

    default:
      return 'bg-muted text-muted-foreground';
  }
}

