import React from 'react';
import { IconType } from 'react-icons';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Variants for the stat card
const cardVariants = cva(
  "relative flex flex-col p-4 rounded-xl overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-white border border-gray-200",
        primary: "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
        secondary: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
        success: "bg-gradient-to-r from-green-500 to-green-600 text-white",
        warning: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white",
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-5",
      },
      animation: {
        none: "",
        pulse: "hover:shadow-md active:scale-95",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "pulse",
    },
  }
);

export interface StatCardProps extends VariantProps<typeof cardVariants> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  variant,
  size,
  animation,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div 
      className={cn(cardVariants({ variant, size, animation }), className)}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <p className={cn(
          "text-sm font-medium opacity-90",
          variant && variant !== 'default' ? 'text-white/90' : 'text-gray-500'
        )}>
          {title}
        </p>
        {icon && (
          <div className={cn(
            "p-2 rounded-full",
            variant && variant !== 'default' ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
          )}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex flex-col">
        <p className={cn(
          "text-2xl font-bold",
          variant && variant !== 'default' ? 'text-white' : 'text-gray-800'
        )}>
          {value}
        </p>
        
        {trend && (
          <div className="flex items-center mt-1">
            <span 
              className={cn(
                "text-xs font-medium flex items-center",
                trend.direction === 'up' 
                  ? (variant && variant !== 'default' ? 'text-white/90' : 'text-green-600') 
                  : trend.direction === 'down'
                    ? (variant && variant !== 'default' ? 'text-white/90' : 'text-red-600')
                    : (variant && variant !== 'default' ? 'text-white/90' : 'text-gray-500')
              )}
            >
              {trend.direction === 'up' && (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
              {trend.direction === 'down' && (
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {trend.value}
            </span>
            {trend.label && (
              <span className={cn(
                "text-xs ml-1",
                variant && variant !== 'default' ? 'text-white/80' : 'text-gray-500'
              )}>
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 