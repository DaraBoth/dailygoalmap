
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-500/90 to-purple-500/90 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl border border-white/20",
        destructive:
          "bg-gradient-to-r from-red-500/90 to-pink-500/90 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl border border-white/20",
        outline:
          "border border-white/30 dark:border-white/20 bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 backdrop-blur-md shadow-sm hover:shadow-lg",
        secondary:
          "bg-white/50 dark:bg-white/10 text-secondary-foreground hover:bg-white/70 dark:hover:bg-white/20 border border-white/20 dark:border-white/10 shadow-sm hover:shadow-lg",
        ghost: "hover:bg-white/30 dark:hover:bg-white/10 hover:backdrop-blur-sm rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-blue-500/80 to-teal-500/80 hover:from-blue-500 hover:to-teal-500 text-white backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20",
        floating: "shadow-lg active:scale-95 transition-all duration-300 bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        circle: "h-10 w-10 rounded-full p-0",
        badge: "h-6 w-6 rounded-full p-0",
        floating: "w-12 h-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
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
