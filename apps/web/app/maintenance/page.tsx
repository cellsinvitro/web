import Link from "next/link";

type MaintenancePageProps = { searchParams: Promise<{ message?: string; path?: string }> };

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const params = await searchParams;
  const message = params.message || "This area is temporarily unavailable for maintenance.";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">CellsInVitro</p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Back shortly</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-300">{message}</p>
        {params.path ? <p className="mt-4 text-xs text-slate-500">{params.path}</p> : null}
        <Link href="/" className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200">Return home</Link>
      </div>
    </main>
  );
}