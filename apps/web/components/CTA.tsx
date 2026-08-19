"use client";

import Link from "next/link";

export default function CTA() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-slate-50 py-16 sm:py-20"
    >
      {/* Subtle scientific background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full border border-slate-200/70"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full border border-slate-200/60"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-[-100px] h-64 w-64 rounded-full bg-slate-200/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-7 py-12 shadow-sm sm:px-12 sm:py-14 lg:px-16">
          
          <div className="flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">

            {/* Text */}
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Explore What&apos;s Next
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Advancing research,
                <span className="text-slate-500"> together.</span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Explore research-focused solutions, upcoming assay kits,
                and learning opportunities from CellsInVitro.
              </p>
            </div>

            {/* Button */}
            <Link
              href="#kits"
              className="group inline-flex shrink-0 items-center gap-3 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/10"
            >
              Explore Research Kits

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}