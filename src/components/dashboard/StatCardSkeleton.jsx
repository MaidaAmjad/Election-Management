export default function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="h-8 w-16 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
