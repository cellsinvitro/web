"use client";

/**
 * PageLoadingScreen
 *
 * Used by route-level loading.tsx files as the Suspense fallback during
 * server-side page transitions. Renders a full-viewport centered spinner
 * using the same CellSpinner as the landing-page loader, but WITHOUT the
 * body-scroll lock or window-load waiting that GlobalLoader (fullScreen)
 * uses (those are only appropriate for initial page load, not route changes).
 */

import { CellSpinner } from "@/components/GlobalLoader";

export default function PageLoadingScreen({
  sublabel = "Loading...",
}: {
  sublabel?: string;
}) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <CellSpinner size={56} />
      <div className="text-center">
        <p className="text-[13px] font-bold tracking-tight text-slate-950">
          CellsInVitro
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
          {sublabel}
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse"
            style={{ animationDelay: `${i * 200}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}
