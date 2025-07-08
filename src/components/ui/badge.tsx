import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm bg-gradient-to-br from-green-400 to-green-600 text-white text-xs px-2 py-1"
)

function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(badgeVariants(), className)} {...props} />
}

export { Badge, badgeVariants }
