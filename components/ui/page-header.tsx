import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-2 mb-6 w-full", className)}>
      <h1 className="text-2xl font-goodtimes text-gray-900">{title}</h1>
      {children}
    </div>
  );
}

export function PageHeaderDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-gray-500 w-full", className)}>
      {children}
    </p>
  );
}

export function PageHeaderActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 w-full", className)}>
      {children}
    </div>
  );
} 