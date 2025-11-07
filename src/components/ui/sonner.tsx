
import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/hooks/use-theme"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast liquid-glass-card group-[.toaster]:text-foreground group-[.toaster]:border-white/20 group-[.toaster]:shadow-2xl backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:liquid-glass-button group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:liquid-glass-button group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
