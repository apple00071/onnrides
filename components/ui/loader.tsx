import { cn } from '@/lib/utils';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Loader({ className, ...props }: LoaderProps) {
  return (
    <div
      className={cn('animate-spin rounded-full border-4 border-primary border-t-transparent', className)}
      {...props}
    />
  );
} 