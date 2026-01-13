import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // DEFAULT/PRIMARY - Main action, sexy emerald gradient
        default:
          "bg-gradient-to-r from-[#4FCB84] via-[#43B273] to-[#2F8C55] text-white shadow-[0_14px_35px_-20px_rgba(41,120,72,0.65)] hover:from-[#47BC79] hover:via-[#3FA467] hover:to-[#297A4B] hover:shadow-[0_18px_40px_-18px_rgba(41,120,72,0.6)] focus-visible:ring-[#3FA467]",
        primary:
          "bg-gradient-to-r from-[#4FCB84] via-[#43B273] to-[#2F8C55] text-white shadow-[0_14px_35px_-20px_rgba(41,120,72,0.65)] hover:from-[#47BC79] hover:via-[#3FA467] hover:to-[#297A4B] hover:shadow-[0_18px_40px_-18px_rgba(41,120,72,0.6)] focus-visible:ring-[#3FA467]",
        // SOLID - Alternative if gradient not wanted
        primarySolid:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:bg-primary/95 focus-visible:ring-primary",
        // OUTLINE - Secondary actions with emerald
        outline:
          "border border-emerald-500/70 text-emerald-600 bg-white hover:bg-emerald-50 hover:text-emerald-700",
        // GHOST - Tertiary/subtle actions
        ghost:
          "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/70",
        // DESTRUCTIVE - Dangerous actions
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive",
        // SECONDARY - Alternative primary (softer emerald)
        secondary:
          "bg-emerald-100 text-emerald-900 hover:bg-emerald-200/80 border border-transparent",
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
