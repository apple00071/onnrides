interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="grid items-start gap-4">
      {children}
    </div>
  );
} 