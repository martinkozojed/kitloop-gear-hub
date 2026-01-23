import React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
    /** Page title - rendered as h1 for a11y */
    title: React.ReactNode;
    /** Optional page description/subtitle */
    description?: React.ReactNode;
    /** Right-aligned action buttons */
    actions?: React.ReactNode;
    /** Optional breadcrumbs above title */
    breadcrumbs?: React.ReactNode;
    /** Show bottom divider (default: false for cleaner look) */
    divider?: boolean;
    /** Additional container classes */
    className?: string;
}

/**
 * PageHeader - Unified page header component for provider pages
 * 
 * Features:
 * - Consistent layout across all provider pages
 * - Responsive: actions wrap on mobile
 * - A11y: title is h1 with proper heading hierarchy
 * - i18n-ready: title/description passed from page via t()
 */
export function PageHeader({
    title,
    description,
    actions,
    breadcrumbs,
    divider = false,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn('space-y-4', className)}>
            {breadcrumbs && (
                <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
                    {breadcrumbs}
                </nav>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-muted-foreground text-sm sm:text-base">
                            {description}
                        </p>
                    )}
                </div>

                {actions && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {divider && <Separator />}
        </div>
    );
}
