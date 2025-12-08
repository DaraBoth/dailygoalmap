
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
            "group toast liquid-glass-card group-[.toaster]:text-foreground group-[.toaster]:bg-white/70 dark:group-[.toaster]:bg-gray-900/70 group-[.toaster]:border-gray-200/50 dark:group-[.toaster]:border-white/20 group-[.toaster]:shadow-2xl backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:hover:bg-blue-700 group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-lg group-[.toast]:shadow-md",
          cancelButton:
            "group-[.toast]:bg-gray-200 dark:group-[.toast]:bg-gray-700 group-[.toast]:text-gray-700 dark:group-[.toast]:text-gray-300 group-[.toast]:hover:bg-gray-300 dark:group-[.toast]:hover:bg-gray-600 group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:rounded-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
