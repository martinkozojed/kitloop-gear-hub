import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusColorClasses, getStatusLabel, ReservationStatus } from '@/lib/status-colors';
import { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
  status: ReservationStatus;
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge - Consistent status display using design tokens
 * Replaces ad-hoc Badge color classes throughout the app
 */
export function StatusBadge({ status, icon: Icon, className, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide shadow-sm',
        getStatusColorClasses(status),
        sizeClasses[size],
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {getStatusLabel(status)}
    </span>
  );
}
