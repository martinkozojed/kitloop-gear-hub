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

export type SemanticVariant = 'warning' | 'info' | 'success' | 'neutral' | 'danger';

/**
 * Central mapping of status to semantic variant
 * 
 * Design rationale:
 * - danger: ONLY for urgent problems (overdue, conflict) - avoid alarm fatigue
 * - warning: Needs attention (hold, pending, unpaid)
 * - info: Active/in-progress states (confirmed, active)
 * - success: Ready for action (ready for pickup)
 * - neutral: Closed states (completed, cancelled) - no action needed
 */
export function getSemanticVariant(status: ReservationStatus): SemanticVariant {
  switch (status) {
    // Warning: Needs attention but not urgent
    case 'hold':
    case 'pending':
    case 'unpaid':
      return 'warning';

    // Info: In progress, active states
    case 'confirmed':
    case 'active':
      return 'info';

    // Success: Ready for pickup (positive action state)
    case 'ready':
      return 'success';

    // Danger: URGENT problems only (overdue, conflict)
    case 'overdue':
    case 'conflict':
      return 'danger';

    // Neutral: Closed states (no action needed)
    case 'completed':
    case 'cancelled':
      return 'neutral';

    default:
      return 'neutral';
  }
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
      return 'bg-[hsl(var(--status-pending)/0.1)] text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending)/0.2)]';

    // Info: Blue (confirmed, active)
    case 'confirmed':
    case 'active':
      return 'bg-[hsl(var(--status-confirmed)/0.1)] text-[hsl(var(--status-confirmed))] border-[hsl(var(--status-confirmed)/0.2)]';

    // Success: Green (ready for pickup)
    case 'ready':
      return 'bg-[hsl(var(--status-active)/0.1)] text-[hsl(var(--status-active))] border-[hsl(var(--status-active)/0.2)]';

    // Danger: Red (URGENT only)
    case 'overdue':
    case 'conflict':
      return 'bg-[hsl(var(--status-overdue)/0.1)] text-[hsl(var(--status-overdue))] border-[hsl(var(--status-overdue)/0.2)]';

    // Neutral: Gray (closed states)
    case 'completed':
    case 'cancelled':
      return 'bg-[hsl(var(--status-completed)/0.1)] text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed)/0.2)]';

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
      return 'bg-[hsl(var(--status-pending))] text-white';

    case 'confirmed':
    case 'active':
      return 'bg-[hsl(var(--status-confirmed))] text-white';

    case 'ready':
      return 'bg-[hsl(var(--status-active))] text-white';

    case 'overdue':
    case 'conflict':
      return 'bg-[hsl(var(--status-overdue))] text-white';

    case 'completed':
    case 'cancelled':
      return 'bg-[hsl(var(--status-completed))] text-white';

    default:
      return 'bg-muted text-muted-foreground';
  }
}

