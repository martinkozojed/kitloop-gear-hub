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
  | 'conflict'
  | 'checked_out'
  | 'returned'
  | 'inspected_closed'
  | 'no_show'
  | 'expired'
  | 'maintenance';

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
    case 'checked_out':
      return 'info'; // Blue

    case 'ready':
    case 'returned':
    case 'inspected_closed':
      return 'success';

    case 'overdue':
    case 'conflict':
    case 'no_show':
      return 'destructive'; // Red

    case 'completed':
    case 'cancelled':
    case 'expired':
    case 'maintenance':
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

    // Info: Blue (confirmed, active, checked_out)
    case 'confirmed':
    case 'active':
    case 'checked_out':
      return 'bg-status-info/10 text-status-info border-status-info/20';

    // Success: Green (ready, returned, inspected_closed)
    case 'ready':
    case 'returned':
    case 'inspected_closed':
      return 'bg-status-success/10 text-status-success border-status-success/20';

    // Danger: Red (URGENT only)
    case 'overdue':
    case 'conflict':
    case 'no_show':
      return 'bg-status-danger/10 text-status-danger border-status-danger/20';

    // Neutral: Gray (closed states)
    case 'completed':
    case 'cancelled':
    case 'expired':
    case 'maintenance':
      return 'bg-status-neutral/10 text-status-neutral border-status-neutral/20';

    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Returns i18n key for status label.
 * For known statuses returns the namespaced key; for unknown statuses returns
 * the fallback key so the UI never renders a raw DB value.
 * Usage: t(getStatusLabelKey(status))
 */
export function getStatusLabelKey(status: string): string {
  const known: ReservationStatus[] = [
    'hold', 'pending', 'confirmed', 'active', 'completed', 'cancelled',
    'overdue', 'ready', 'unpaid', 'conflict', 'checked_out', 'returned',
    'inspected_closed', 'no_show', 'expired', 'maintenance',
  ];
  if ((known as string[]).includes(status)) {
    return `provider.dashboard.status.${status}`;
  }
  return 'provider.dashboard.status.unknown';
}

/**
 * Fallback: Returns a user-friendly label for status (EN fallback).
 * @deprecated Use getStatusLabelKey with i18n t() function instead.
 */
export function getStatusLabel(status: string): string {
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
    case 'checked_out': return 'Checked out';
    case 'returned': return 'Returned';
    case 'inspected_closed': return 'Closed';
    case 'no_show': return 'No show';
    case 'expired': return 'Expired';
    case 'maintenance': return 'Maintenance';
    default: return 'Unknown status';
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
    case 'checked_out':
      return 'bg-status-info text-white';

    case 'ready':
    case 'returned':
    case 'inspected_closed':
      return 'bg-status-success text-white';

    case 'overdue':
    case 'conflict':
    case 'no_show':
      return 'bg-status-danger text-white';

    case 'completed':
    case 'cancelled':
    case 'expired':
    case 'maintenance':
      return 'bg-status-neutral text-white';

    default:
      return 'bg-muted text-muted-foreground';
  }
}

