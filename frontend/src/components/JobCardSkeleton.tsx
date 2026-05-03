export default function JobCardSkeleton() {
  return (
    <article
      role="status"
      aria-busy="true"
      aria-label="Chargement de l'offre"
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="min-w-0 flex-1 animate-pulse">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="h-5 w-24 rounded-full bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-5 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="h-5 w-3/4 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-16 rounded-2xl bg-slate-100" />
            <div className="h-16 rounded-2xl bg-slate-100" />
            <div className="h-16 rounded-2xl bg-slate-100" />
          </div>
          <div className="mt-4 h-4 w-full rounded bg-slate-200" />
          <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-6 w-14 rounded-full bg-slate-200" />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-9 w-28 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="flex w-[90px] shrink-0 flex-col items-end gap-3 sm:w-[104px]">
          <div className="h-[72px] w-[72px] animate-pulse rounded-[22px] bg-slate-200 sm:h-[84px] sm:w-[84px]" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </article>
  );
}

export function JobCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
