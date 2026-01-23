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
 * | success     | Teal-600        | Completing actions (Complete return)        |
 * | warning     | Amber-600       | Attention actions (Resolve)                 |
 * | destructive | Red-600         | Dangerous/delete actions                    |
 * | ghost       | Text only       | Tertiary, tabs, minimal actions             |
 * | outline     | Border only     | Alternative secondary                       |
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-token-md text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA - Marketing & 1 global in-app (sidebar "New Reservation")
        // Emerald gradient - attention magnet, use sparingly
        cta:
          "bg-gradient-to-r from-[#4FCB84] via-[#43B273] to-[#2F8C55] text-white shadow-[0_14px_35px_-20px_rgba(41,120,72,0.65)] hover:from-[#47BC79] hover:via-[#3FA467] hover:to-[#297A4B] hover:shadow-[0_18px_40px_-18px_rgba(41,120,72,0.6)] focus-visible:ring-[#3FA467]",

        // PRIMARY - In-app main actions (page-level)
        // Slate-900 solid - professional, authoritative, doesn't compete with status colors
        default:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-500",
        primary:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-500",

        // SECONDARY - Row actions (Issue), secondary buttons
        // Outline style - visible but calm, doesn't compete with status badges
        secondary:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400",

        // SUCCESS - Completing actions (Complete return, Ready)
        // Teal-600 - distinct from brand emerald, signals "done/complete"
        success:
          "bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:bg-teal-800 focus-visible:ring-teal-500",

        // WARNING - Attention actions (Resolve exception)
        // Amber-600 - requires attention but not critical
        warning:
          "bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-amber-500",

        // DESTRUCTIVE - Dangerous actions (Delete, Cancel)
        // Red-600 - use sparingly to avoid alarm fatigue
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",

        // OUTLINE - Alternative secondary with brand hint
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400",

        // GHOST - Tertiary, tabs, minimal footprint
        ghost:
          "text-slate-600 hover:text-slate-900 hover:bg-slate-100",

        // LINK - Text link style
        link:
          "text-emerald-600 underline-offset-4 hover:underline hover:text-emerald-700",
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
