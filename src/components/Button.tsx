import * as React from "react"
import { LucideIcon } from "lucide-react"

export const buttonVariants = {
  base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  variant: {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    success: "bg-green-600 text-white shadow-sm hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
  },
  size: {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-10 px-8",
    icon: "h-9 w-9",
  }
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant
  size?: keyof typeof buttonVariants.size
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  asChild?: boolean
}

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const LeftIconComp = LeftIcon && <LeftIcon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />
  const RightIconComp = RightIcon && <RightIcon className={`h-4 w-4 ${children ? 'ml-2' : ''}`} />

  const classes = `${buttonVariants.base} ${buttonVariants.variant[variant]} ${buttonVariants.size[size]} ${className}`

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        LeftIconComp
      )}
      {children}
      {!isLoading && RightIconComp}
    </button>
  )
}
