import React from 'react'
import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
  fluid?: boolean
}

export function Container({
  children,
  className,
  as: Component = "div",
  fluid = false
}: ContainerProps) {
  return (
    <Component 
      className={cn(
        "container-custom",
        {
          "!max-w-none": fluid
        },
        className
      )}
    >
      {children}
    </Component>
  )
} 