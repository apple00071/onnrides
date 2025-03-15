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
      isPWA && "sticky top-0 z-10 bg-white py-4 border-b border-gray-100 shadow-sm -mx-4 px-4 mb-8",
      className
    )}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-goodtimes text-gray-900">{title}</h1>
        
        {/* Show a subtle "PWA" indicator only in PWA mode */}
        {isPWA && (
          <div className="py-1 px-2 bg-orange-50 rounded text-xs font-medium text-orange-600">
            Admin
          </div>
        )}
      </div>
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
    <div className={cn("flex items-center gap-4 w-full mt-2", className)}>
      {children}
    </div>
  );
} 