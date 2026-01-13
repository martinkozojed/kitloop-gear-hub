/**
 * Status Color Utilities
 * Provides consistent color classes for reservation statuses
 * Uses design tokens from index.css
 */

export type ReservationStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'active' 
  | 'completed' 
  | 'cancelled' 
  | 'overdue'
  | 'ready'
  | 'unpaid'
  | 'conflict';

/**
 * Returns Tailwind classes for a given status
 * Uses CSS custom properties (design tokens) for consistency
 */
export function getStatusColorClasses(status: ReservationStatus): string {
  switch (status) {
    case 'pending':
    case 'unpaid':
      return 'bg-[hsl(var(--status-pending)/0.1)] text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending)/0.2)]';
    
    case 'confirmed':
      return 'bg-[hsl(var(--status-confirmed)/0.1)] text-[hsl(var(--status-confirmed))] border-[hsl(var(--status-confirmed)/0.2)]';
    
    case 'active':
    case 'ready':
      return 'bg-[hsl(var(--status-active)/0.1)] text-[hsl(var(--status-active))] border-[hsl(var(--status-active)/0.2)]';
    
    case 'overdue':
    case 'conflict':
      return 'bg-[hsl(var(--status-overdue)/0.1)] text-[hsl(var(--status-overdue))] border-[hsl(var(--status-overdue)/0.2)]';
    
    case 'completed':
    case 'cancelled':
      return 'bg-[hsl(var(--status-completed)/0.1)] text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed)/0.2)]';
    
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Returns a user-friendly label for status
 */
export function getStatusLabel(status: ReservationStatus): string {
  switch (status) {
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
    case 'pending':
    case 'unpaid':
      return 'bg-[hsl(var(--status-pending))] text-white';
    
    case 'confirmed':
      return 'bg-[hsl(var(--status-confirmed))] text-white';
    
    case 'active':
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
