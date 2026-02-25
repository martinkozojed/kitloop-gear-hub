import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button Variant Hierarchy (SSOT)
 * 
 * | Variant     | Color           | Usage                                      |
 * |-------------|-----------------|---------------------------------------------|
 * | cta         | Emerald gradient| Marketing CTA + 1 global CTA in app (sidebar)|
 * | primary     | Slate-900       | In-app primary actions (page-level)         |
 * | secondary   | Slate outline   | Row actions (Issue), secondary actions      |
 * | success     | status-success  | Completing actions (Complete return)        |
 * | warning     | status-warning  | Attention actions (Resolve)                 |
 * | destructive | destructive     | Dangerous/delete actions (design token)     |
 * | ghost       | Text only       | Tertiary, tabs, minimal actions             |
 * | outline     | Border only     | Alternative secondary                       |
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-token-md text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA - Marketing & 1 global in-app (sidebar "New Reservation")
        // Gradient defined in index.css .gradient-cta — use sparingly
        cta:
          "gradient-cta text-white focus-visible:ring-[#3FA467]",

        // MARKETING - Public-only CTA (SSOT: allowed only on public pages; lint fails in provider)
        marketing:
          "gradient-cta text-white focus-visible:ring-[#3FA467]",

        // PRIMARY - In-app main actions (page-level); uses design tokens
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 focus-visible:ring-ring",
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 focus-visible:ring-ring",

        // SECONDARY - Row actions (Issue), secondary buttons; tokens only
        secondary:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",

        // SUCCESS - Completing actions (Complete return, Ready); uses status token
        success:
          "bg-status-success text-status-success-foreground shadow-sm hover:opacity-90 focus-visible:ring-status-success focus-visible:ring-offset-2",

        // WARNING - Attention actions (Resolve exception); uses status token
        warning:
          "bg-status-warning text-status-warning-foreground shadow-sm hover:opacity-90 focus-visible:ring-status-warning focus-visible:ring-offset-2",

        // DESTRUCTIVE - Dangerous actions (Delete, Cancel); uses design token
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 focus-visible:ring-destructive focus-visible:ring-offset-2",

        // OUTLINE - Alternative secondary; tokens only
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",

        // GHOST - Tertiary, tabs, minimal footprint
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-accent",

        // LINK - Text link style (brand hint via ring on focus)
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
