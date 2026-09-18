export default function AdminLogbookLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
