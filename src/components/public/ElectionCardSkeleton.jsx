export default function ElectionCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-24 bg-slate-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
