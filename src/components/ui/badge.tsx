import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-token-sm px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "bg-muted text-muted-foreground hover:bg-muted/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline:
          "text-foreground",
        success:
          "bg-[hsl(var(--action-success))] text-white hover:bg-[hsl(var(--action-success)/0.8)]",
        warning:
          "bg-[hsl(var(--action-warning))] text-white hover:bg-[hsl(var(--action-warning)/0.8)]",
        info:
          "bg-[hsl(var(--action-info))] text-white hover:bg-[hsl(var(--action-info)/0.8)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
