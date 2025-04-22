import React from 'react'
import { cn } from "@/lib/utils"

interface GridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 2 | 4 | 6 | 8 | 12
  mdCols?: 1 | 2 | 3 | 4 | 6 | 12
  lgCols?: 1 | 2 | 3 | 4 | 6 | 12
  xlCols?: 1 | 2 | 3 | 4 | 6 | 12
}

const columnsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12'
}

const gapMap = {
  2: 'gap-2',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12'
}

export function Grid({
  children,
  className,
  cols = 1,
  gap = 4,
  mdCols,
  lgCols,
  xlCols
}: GridProps) {
  return (
    <div 
      className={cn(
        'grid',
        columnsMap[cols],
        gapMap[gap],
        mdCols && `md:${columnsMap[mdCols]}`,
        lgCols && `lg:${columnsMap[lgCols]}`,
        xlCols && `xl:${columnsMap[xlCols]}`,
        className
      )}
    >
      {children}
    </div>
  )
} 