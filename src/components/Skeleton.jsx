export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={i === 0 ? 'w-1/2' : i % 2 === 0 ? 'w-3/4' : 'w-full'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="grid gap-0">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3 border-b">
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="flex-1">
                <SkeletonLine height="h-3" width={c === 0 ? 'w-3/4' : 'w-1/2'} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl h-24 bg-gray-200 animate-pulse" />
        ))}
      </div>
      <SkeletonCard lines={4} />
      <div className="grid md:grid-cols-2 gap-5">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border px-4 py-3">
        <SkeletonLine height="h-2" />
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex">
          <div className="w-14 bg-gray-50 border-r" style={{ height: 540 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 border-r last:border-r-0">
              <div className="px-2 py-2 border-b bg-gray-50">
                <SkeletonLine height="h-3" width="w-1/2" />
              </div>
              <div className="p-1 space-y-2">
                {i % 2 === 0 && (
                  <div className="h-16 bg-gray-200 animate-pulse rounded" />
                )}
                {i % 3 === 0 && (
                  <div className="h-12 bg-gray-200 animate-pulse rounded mt-20" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
