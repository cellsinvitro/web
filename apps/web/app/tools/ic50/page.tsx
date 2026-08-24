import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IC50Calculator from "@/components/IC50Calculator";

export const metadata: Metadata = {
  title: "IC50 Calculator | CellsInVitro",
  description:
    "Fit dose-response data with four-parameter logistic regression and calculate IC50 values for inhibition assays.",
};

export default function IC50Page() {
  return (
    <main>
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto px-6 lg:px-8">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
            All tools
          </Link>

          <div className="mt-7 max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Lab Tools
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              IC₅₀
              <span className="text-slate-500"> calculator.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Enter inhibition assay data, fit a four-parameter logistic curve,
              and estimate the half-maximal inhibitory concentration.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <aside className="shrink-0 lg:w-1/4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-slate-950">4PL model</h2>
                <p className="mt-3 font-mono text-sm leading-7 text-slate-600">
                  Y = Bottom + (Top − Bottom) / (1 + (X / IC₅₀)<sup>n</sup>)
                </p>
                <dl className="mt-4 space-y-2 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-800">IC₅₀</dt>
                    <dd className="mt-0.5">
                      Concentration producing 50% of maximal inhibition
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-800">Hill coefficient</dt>
                    <dd className="mt-0.5">Steepness of the dose–response curve</dd>
                  </div>
                </dl>
              </div>
            </aside>

            <div className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:w-3/4">
              <IC50Calculator />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
