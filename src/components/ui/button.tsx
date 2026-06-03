import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Orbit / Magic UI variants
        magic:
          "relative overflow-hidden border border-primary/30 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.99] transition-all duration-300 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary-foreground)/0.22),transparent_50%)] before:opacity-80 before:transition-opacity hover:before:opacity-100",
        shimmer:
          "relative overflow-hidden border border-primary/40 bg-primary text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/90 hover:shadow-md active:scale-[0.99] before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent_35%,hsl(var(--primary-foreground)/0.28)_50%,transparent_65%)] before:bg-[length:220%_100%] before:animate-[shimmer_2.1s_linear_infinite]",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-foreground shadow-sm",
        orbit: "bg-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--primary),0.3)] hover:shadow-[0_15px_30px_-5px_rgba(var(--primary),0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 px-10 rounded-2xl text-lg",
        icon: "h-10 w-10",
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
