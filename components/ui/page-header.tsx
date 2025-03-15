import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

// Check if we're in a PWA environment
function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    setIsPWA(
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore - for iOS Safari
      (window.navigator as any).standalone === true
    );
  }, []);
  
  return isPWA;
}

export function PageHeader({ title, className, children }: PageHeaderProps) {
  const isPWA = useIsPWA();
  
  return (
    <div className={cn(
      "flex flex-col space-y-2 mb-6 w-full", 
      isPWA && "sticky top-0 z-10 bg-white py-4 px-1 -mx-1 shadow-sm",
      className
    )}>
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