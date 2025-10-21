import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-green-500 to-green-600 text-white",
        secondary: "bg-muted text-muted-foreground",
        destructive: "bg-red-500 text-white",
        outline:
          "border border-border bg-transparent text-muted-foreground",
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
