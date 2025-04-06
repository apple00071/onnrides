import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: boolean | 'sm' | 'md' | 'lg' | 'none';
  mobileFullWidth?: boolean;
}

export function ResponsiveContainer({ 
  children, 
  className = '',
  maxWidth = '7xl',
  padding = true,
  mobileFullWidth = false
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full',
  };

  const paddingClasses = {
    true: 'px-4 sm:px-6 md:px-8',
    'sm': 'px-2 sm:px-4 md:px-6',
    'md': 'px-4 sm:px-6 md:px-8',
    'lg': 'px-6 sm:px-8 md:px-10',
    'none': '',
    false: ''
  };

  const paddingClass = typeof padding === 'boolean' || padding === 'none' 
    ? paddingClasses[padding.toString() as keyof typeof paddingClasses] 
    : paddingClasses[padding];

  const mobileWidthClass = mobileFullWidth ? 'w-full sm:mx-auto' : 'mx-auto';

  return (
    <div className={`w-full ${mobileWidthClass} ${paddingClass} ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
} 