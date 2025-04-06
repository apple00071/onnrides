import React, { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((data: T) => ReactNode);
  mobileLabel?: string;
  className?: string;
  hideOnMobile?: boolean;
  priority?: number;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  className?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  mobileCompact?: boolean;
  mobileDividers?: boolean;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyField,
  className = '',
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  mobileCompact = false,
  mobileDividers = true
}: ResponsiveTableProps<T>) {
  // Handler for row click if provided
  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  };

  // Get cell value based on accessor type
  const getCellValue = (item: T, accessor: Column<T>['accessor']): ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    
    // Handle potentially non-renderable values by converting to string if needed
    const value = item[accessor];
    
    // Check for null or undefined
    if (value === null || value === undefined) {
      return '';
    }
    
    // Handle objects that aren't React elements by converting to string
    if (typeof value === 'object' && value !== null && !React.isValidElement(value)) {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    
    // Otherwise return the value directly
    return value as ReactNode;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#f26e24] border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-6 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Sort columns for mobile view based on priority
  const mobileColumns = [...columns]
    .filter(col => !col.hideOnMobile)
    .sort((a, b) => {
      const priorityA = a.priority !== undefined ? a.priority : 999;
      const priorityB = b.priority !== undefined ? b.priority : 999;
      return priorityA - priorityB;
    });

  return (
    <div className={`w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {/* Desktop view - traditional table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIndex) => (
              <tr 
                key={String(item[keyField])} 
                className={`border-b transition-colors hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => handleRowClick(item)}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`px-4 py-3 text-sm text-gray-700 ${column.className || ''}`}
                  >
                    {getCellValue(item, column.accessor)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view - card layout */}
      <div className="md:hidden">
        {data.map((item, index) => (
          <div 
            key={String(item[keyField])} 
            className={`border-b ${mobileCompact ? 'p-3' : 'p-4'} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => handleRowClick(item)}
          >
            {mobileColumns.map((column, colIndex) => (
              <div 
                key={colIndex} 
                className={`
                  ${mobileCompact ? 'mb-1.5 py-0.5' : 'mb-2 py-1'} 
                  ${mobileDividers && colIndex < mobileColumns.length - 1 ? 'border-b border-gray-100 pb-2' : ''} 
                  flex justify-between items-start
                `}
              >
                <span className={`${mobileCompact ? 'text-xs' : 'text-sm'} font-medium text-gray-500`}>
                  {column.mobileLabel || column.header}:
                </span>
                <span className={`ml-2 ${mobileCompact ? 'text-xs' : 'text-sm'} text-right text-gray-900 ${column.className || ''}`}>
                  {getCellValue(item, column.accessor)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 