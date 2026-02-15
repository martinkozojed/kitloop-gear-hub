import React from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
    /** Primary filters (left side) - typically search, status filter */
    children: React.ReactNode;
    /** Secondary actions (right side) - view toggles, additional controls */
    actions?: React.ReactNode;
    /** Optional meta row below main filters */
    meta?: React.ReactNode;
    /** Additional container classes */
    className?: string;
}

/**
 * FilterBar - Unified filter/search bar layout component
 * 
 * Features:
 * - Consistent spacing and responsive layout
 * - Slots for primary filters (left) and secondary actions (right)
 * - Optional meta row for filter badges, counts, etc.
 * - A11y: proper label handling expected from child inputs
 */
export function FilterBar({
    children,
    actions,
    meta,
    className,
}: FilterBarProps) {
    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Primary filters - left side */}
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    {children}
                </div>

                {/* Secondary actions - right side */}
                {actions && (
                    <div className="flex shrink-0 items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>

            {/* Optional meta row */}
            {meta && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {meta}
                </div>
            )}
        </div>
    );
}

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Search icon placement (default: left) */
    icon?: React.ReactNode;
}

/**
 * SearchInput - Styled search input with icon
 * Use within FilterBar for consistent styling
 */
export function SearchInput({
    icon,
    className,
    placeholder,
    ...props
}: SearchInputProps) {
    return (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                type="search"
                placeholder={placeholder}
                aria-label={placeholder as string || 'Search'}
                className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    icon && 'pl-10',
                    className
                )}
                {...props}
            />
        </div>
    );
}
