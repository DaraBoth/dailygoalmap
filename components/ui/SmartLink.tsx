import React from 'react'
import Link from 'next/link'
import { useLinkPreloader } from '@/hooks/useRouterNavigation'
import { cn } from '@/lib/utils'

interface SmartLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: React.ReactNode
  className?: string
  preload?: boolean | 'intent' | 'viewport' | 'render'
  external?: boolean
}

/**
 * Enhanced Link component with automatic preloading and performance optimizations
 */
export function SmartLink({ 
  to, 
  children, 
  className, 
  preload = true, 
  external = false,
  ...props 
}: SmartLinkProps) {
  const { getLinkProps } = useLinkPreloader()

  // Handle external links
  if (external || to.startsWith('http') || to.startsWith('mailto:') || to.startsWith('tel:')) {
    return (
      <a
        href={to}
        className={className}
        target={to.startsWith('http') ? '_blank' : undefined}
        rel={to.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  }

  // Internal link with preloading
  const linkProps = preload ? getLinkProps(to) : {}

  return (
    <Link
      href={to}
      className={className}
      {...linkProps}
      {...props}
    >
      {children}
    </Link>
  )
}

/**
 * Button-styled link component
 */
interface SmartButtonLinkProps extends SmartLinkProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function SmartButtonLink({
  variant = 'default',
  size = 'default',
  className,
  ...props
}: SmartButtonLinkProps) {
  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  }
  
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  }

  return (
    <SmartLink
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

/**
 * Navigation link component for menus
 */
interface SmartNavLinkProps extends SmartLinkProps {
  active?: boolean
  icon?: React.ReactNode
}

export function SmartNavLink({
  active = false,
  icon,
  children,
  className,
  ...props
}: SmartNavLinkProps) {
  return (
    <SmartLink
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        active 
          ? 'bg-accent text-accent-foreground' 
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </SmartLink>
  )
}

/**
 * Card link component for clickable cards
 */
interface SmartCardLinkProps extends SmartLinkProps {
  hover?: boolean
}

export function SmartCardLink({
  hover = true,
  className,
  children,
  ...props
}: SmartCardLinkProps) {
  return (
    <SmartLink
      className={cn(
        'block rounded-lg border bg-card text-card-foreground shadow-sm',
        hover && 'transition-all hover:shadow-md hover:scale-[1.02]',
        className
      )}
      {...props}
    >
      {children}
    </SmartLink>
  )
}

export default SmartLink
