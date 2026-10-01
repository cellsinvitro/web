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
    <main className="bg-slate-50 min-h-screen">
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto px-6 lg:px-8 max-w-7xl">
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
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 0 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
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
            {/* Left Sidebar: Quick Guide FAQ & Merged 4PL Model + Method Summary */}
            <aside className="shrink-0 lg:w-1/4 space-y-6">
              {/* How to Use Box */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    ?
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    How to use the calculator
                  </h2>
                </div>
                <ol className="mt-3 space-y-2.5 text-xs leading-5 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 shrink-0">1.</span>
                    <span>
                      <strong>Paste or type data:</strong> Paste concentration & response values directly from Excel or type them column-wise (Concentration, Response 1, Response 2...).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 shrink-0">2.</span>
                    <span>
                      <strong>Process data:</strong> Click <strong>&ldquo;Process data&rdquo;</strong> to summarize replicates and calculate SEM error bars.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 shrink-0">3.</span>
                    <span>
                      <strong>Calculate IC₅₀:</strong> Check your processed input table and press <strong>&ldquo;Calculate IC₅₀&rdquo;</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-800 shrink-0">4.</span>
                    <span>
                      <strong>Review & Graph:</strong> Note your calculated values and refer to the fitted dose–response curve graph.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Merged 4PL Model & Method Reference Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-slate-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    4PL Model & Method
                  </h2>
                </div>
                <p className="mt-3 font-mono text-xs leading-6 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                  Y = Bottom + (Top − Bottom) / (1 + (X / IC₅₀)<sup>n</sup>)
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  Nonlinear least squares fitting of the four-parameter logistic (Hill equation) model using Nelder-Mead optimization. Calculates R² goodness of fit, SEM for replicates, and direct 50% response interpolation.
                </p>
                <dl className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
                  <div>
                    <dt className="font-semibold text-slate-900">IC₅₀</dt>
                    <dd className="mt-0.5">
                      Concentration producing 50% of maximal inhibition
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Hill coefficient (n)</dt>
                    <dd className="mt-0.5">Steepness factor of the dose–response curve</dd>
                  </div>
                </dl>
              </div>
            </aside>

            {/* Main Calculator Content */}
            <div className="w-full rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:w-3/4">
              <IC50Calculator />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
