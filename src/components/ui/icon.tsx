import React from "react";
import { type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconSize = "sm" | "md" | "lg" | "xl";

interface IconProps extends Omit<LucideProps, "ref"> {
    /**
     * The Lucide icon component to render
     */
    icon: React.ElementType;
    /**
     * Size of the icon
     * @default "sm" (16px)
     */
    size?: IconSize;
}

const sizeMap: Record<IconSize, string> = {
    sm: "size-4", // 16px
    md: "size-5", // 20px
    lg: "size-6", // 24px
    xl: "size-8", // 32px
};

/**
 * Standardized Icon wrapper for consistent sizing and styling.
 * 
 * Usage:
 * <Icon icon={Check} size="sm" />
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ icon: IconComponent, size = "sm", className, strokeWidth, ...props }, ref) => {
        return (
            <IconComponent
                ref={ref}
                aria-hidden="true"
                strokeWidth={strokeWidth ?? 2} // Default to 2 to match Lucide default, but explicit
                className={cn(sizeMap[size], className)}
                {...props}
            />
        );
    }
);
Icon.displayName = "Icon";
