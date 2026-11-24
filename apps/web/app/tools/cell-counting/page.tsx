import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CellCountingCalculator from "@/components/CellCountingCalculator";

export const metadata: Metadata = {
  title: "Cell Counting Calculator | CellsInVitro",
  description:
    "Calculate cell concentration, total cells in suspension, and cell viability percentage from hemocytometer counts.",
};

export default function CellCountingPage() {
  return (
    <main>
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
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

          <div className="mt-7 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
            <aside className="space-y-6">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Lab Tools &middot; Cell Culture
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Cell Counting
                  <span className="text-slate-500"> Calculator</span>
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-500">
                  Standard hemocytometer calculations for cell suspension density, total harvest yields, and trypan blue exclusion viability.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Hemocytometer Methodology
                </h2>
                <dl className="mt-3 space-y-3 text-sm text-slate-600">
                  <div>
                    <dt className="font-semibold text-slate-800">Standard Grid Volume</dt>
                    <dd className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      Each large 1 mm &times; 1 mm square has a depth of 0.1 mm, giving a volume of 0.1 mm<sup>3</sup> (10<sup>-4</sup> mL).
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Concentration Equation</dt>
                    <dd className="mt-0.5 font-mono text-xs text-slate-500">
                      Cells/mL = (Count / Squares) &times; Dilution &times; 10,000
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">Trypan Blue Viability</dt>
                    <dd className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      Viability (%) = [Viable cells / Total cells counted] &times; 100%
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Calculator
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter your counted squares and cell numbers below.
              </p>
              <div className="mt-6">
                <CellCountingCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
