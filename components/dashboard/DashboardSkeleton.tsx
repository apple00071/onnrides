export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:gap-8">
      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[120px] rounded-xl border bg-card p-6 animate-pulse"
          />
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <div className="h-[400px] rounded-xl border bg-card animate-pulse" />
        </div>
        <div className="col-span-3">
          <div className="h-[400px] rounded-xl border bg-card animate-pulse" />
        </div>
      </div>
    </div>
  );
} 