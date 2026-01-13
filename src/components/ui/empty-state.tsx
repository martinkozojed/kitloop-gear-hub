
import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: "default" | "outline" | "ghost";
    };
    className?: string;
    children?: React.ReactNode;
    variant?: "default" | "subtle";
}

/**
 * EmptyState - Stripe-inspired empty state component
 * Clean, minimal, with clear call-to-action
 */
export function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    action, 
    className, 
    children,
    variant = "default"
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-6 text-center",
            variant === "default" && "border rounded-lg bg-muted/5 border-dashed",
            variant === "subtle" && "bg-transparent",
            className
        )}>
            {Icon && (
                <div className={cn(
                    "mb-4 rounded-full flex items-center justify-center",
                    variant === "default" && "p-4 bg-muted/30",
                    variant === "subtle" && "p-3 bg-muted/20"
                )}>
                    <Icon className={cn(
                        "text-muted-foreground/60",
                        variant === "default" && "w-10 h-10",
                        variant === "subtle" && "w-8 h-8"
                    )} />
                </div>
            )}
            <h3 className={cn(
                "font-semibold tracking-tight text-foreground",
                variant === "default" && "text-lg",
                variant === "subtle" && "text-base"
            )}>
                {title}
            </h3>
            {description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <Button 
                    onClick={action.onClick} 
                    className="mt-6" 
                    variant={action.variant || "default"}
                    size="sm"
                >
                    {action.label}
                </Button>
            )}
            {children}
        </div>
    );
}
