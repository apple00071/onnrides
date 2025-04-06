import React from 'react';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  onClick?: () => void;
  compact?: boolean; // For more compact mobile view
  noPadding?: boolean; // Option to remove padding
}

export function ResponsiveCard({
  children,
  className = '',
  title,
  subtitle,
  footer,
  headerRight,
  onClick,
  compact = false,
  noPadding = false
}: ResponsiveCardProps) {
  return (
    <div 
      className={`
        w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all 
        ${onClick ? 'cursor-pointer hover:shadow-md active:shadow-inner' : ''}
        ${compact ? 'text-sm' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Card Header */}
      {(title || subtitle || headerRight) && (
        <div className={`border-b border-gray-100 ${compact ? 'px-3 py-2' : 'px-4 py-3'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2`}>
          <div>
            {title && <h3 className={`${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-medium text-gray-900`}>{title}</h3>}
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerRight && (
            <div className="mt-2 sm:mt-0 self-stretch sm:self-center">
              {headerRight}
            </div>
          )}
        </div>
      )}

      {/* Card Body */}
      <div className={`${noPadding ? '' : compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}`}>
        {children}
      </div>

      {/* Card Footer */}
      {footer && (
        <div className={`border-t border-gray-100 ${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-gray-50`}>
          {footer}
        </div>
      )}
    </div>
  );
} 