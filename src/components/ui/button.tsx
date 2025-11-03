
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 liquid-glass-button text-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-foreground hover:bg-primary/30",
        destructive: "bg-destructive/20 text-destructive-foreground hover:bg-destructive/30",
        outline: "border-white/50 dark:border-white/50 bg-white/10 hover:bg-white/30 text-foreground",
        secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
        ghost: "bg-transparent border-0 hover:bg-white/20 hover:text-accent-foreground shadow-none",
        link: "text-primary underline-offset-4 hover:underline bg-transparent border-0 shadow-none",
        gradient: "bg-gradient-to-r from-blue-500/20 to-teal-500/20 hover:from-blue-500/30 hover:to-teal-500/30 text-foreground",
        floating: "bg-white/20 hover:bg-white/30 active:scale-95",
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
