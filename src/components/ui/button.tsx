import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Variant Hierarchy (SSOT)
 *
 * | Variant     | Color           | Usage                                      |
 * |-------------|-----------------|---------------------------------------------|
 * | cta         | Teal gradient   | Marketing CTA + 1 global CTA in app (sidebar)|
 * | primary     | Brand-500 teal  | In-app primary actions (page-level)         |
 * | secondary   | Border + teal   | Row actions (Issue), secondary actions      |
 * | success     | status-success  | Completing actions (Complete return)        |
 * | warning     | status-warning  | Attention actions (Resolve)                 |
 * | destructive | destructive     | Dangerous/delete actions (design token)     |
 * | ghost       | Text only       | Tertiary, tabs, minimal actions             |
 * | outline     | Border only     | Alternative secondary                       |
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-token-md text-sm font-semibold ring-offset-background transition-all duration-fast ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA - Marketing & 1 global in-app (sidebar "New Reservation")
        cta:
          "gradient-cta text-white focus-visible:ring-brand-500 hover:-translate-y-0.5 active:scale-[0.97]",

        // MARKETING - Public-only CTA
        marketing:
          "gradient-cta text-white focus-visible:ring-brand-500 hover:-translate-y-0.5 active:scale-[0.97]",

        // PRIMARY - In-app main actions; brand teal + shadow-brand
        default:
          "bg-primary text-primary-foreground shadow-brand hover:bg-brand-400 hover:shadow-elevated hover:-translate-y-0.5 active:bg-brand-700 active:scale-[0.97] active:shadow-sm",
        primary:
          "bg-primary text-primary-foreground shadow-brand hover:bg-brand-400 hover:shadow-elevated hover:-translate-y-0.5 active:bg-brand-700 active:scale-[0.97] active:shadow-sm",

        // SECONDARY - Row actions, secondary buttons
        secondary:
          "border border-border bg-background text-foreground hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100",

        // SUCCESS - Completing actions; uses status token
        success:
          "bg-status-success text-status-success-foreground shadow-sm hover:bg-green-400 hover:shadow-md hover:-translate-y-0.5 active:bg-green-700 active:scale-[0.97] focus-visible:ring-status-success",

        // WARNING - Attention actions; uses status token
        warning:
          "bg-status-warning text-status-warning-foreground shadow-sm hover:bg-amber-400 hover:shadow-md hover:-translate-y-0.5 active:bg-amber-700 active:scale-[0.97] focus-visible:ring-status-warning",

        // DESTRUCTIVE - Dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5 active:bg-red-800 active:scale-[0.97]",

        // OUTLINE - Alternative secondary
        outline:
          "border border-border bg-transparent text-foreground hover:border-brand-300 hover:text-brand-600 active:bg-brand-50",

        // GHOST - Tertiary, tabs, minimal footprint
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent/80",

        // LINK - Text link style
        link:
          "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        cta: "min-h-11 px-5 text-base font-semibold tracking-[-0.01em]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
