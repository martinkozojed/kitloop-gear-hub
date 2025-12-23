
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
    };
    className?: string;
    children?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, className, children }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/5 border-dashed", className)}>
            {Icon && (
                <div className="p-3 rounded-full bg-muted/20 mb-4">
                    <Icon className="w-8 h-8 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-lg font-medium tracking-tight text-foreground">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {description}
                </p>
            )}
            {action && (
                <Button onClick={action.onClick} className="mt-4" variant="outline">
                    {action.label}
                </Button>
            )}
            {children}
        </div>
    );
}
