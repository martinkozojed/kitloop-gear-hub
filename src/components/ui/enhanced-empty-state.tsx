import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  animate?: boolean;
}

/**
 * Professional empty state component with wow factor
 * 
 * Features:
 * - Beautiful icon with gradient background
 * - Smooth animations
 * - Primary + Secondary CTA
 * - Fully responsive
 * 
 * @example
 * <EnhancedEmptyState
 *   icon={Package}
 *   title="No inventory yet"
 *   description="Start by adding your first product or import from CSV"
 *   action={{
 *     label: "Add Product",
 *     onClick: () => setShowForm(true),
 *     icon: Plus
 *   }}
 *   secondaryAction={{
 *     label: "Import CSV",
 *     onClick: () => setShowImport(true)
 *   }}
 * />
 */
export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  animate = true
}: EnhancedEmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        animate && "animate-fade-in",
        className
      )}
    >
      {/* Icon with gradient background */}
      <div className="relative mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500" />
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-6 border border-primary/10 group-hover:border-primary/20 transition-all duration-300 group-hover:scale-110">
          <Icon className="w-12 h-12 text-primary/70 group-hover:text-primary transition-colors duration-300" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 text-foreground">
        {title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              size="lg"
              className="group shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {action.icon && (
                <action.icon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
              )}
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
              className="group hover:bg-muted transition-all duration-300"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
