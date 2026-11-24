import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DilutionCalculator from "@/components/DilutionCalculator";

export const metadata: Metadata = {
  title: "Dilution Calculator | CellsInVitro",
  description:
    "Calculate the stock solution volume and diluent required to prepare a desired concentration and final volume for scientific workflows.",
};

export default function DilutionPage() {
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
                  Lab Tools &middot; Solution Prep
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Dilution
                  <span className="text-slate-500"> Calculator</span>
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-500">
                  Calculate the stock solution volume required to prepare a desired concentration and final volume using the standard dilution equation.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Dilution Equation &amp; Definitions
                </h2>
                <dl className="mt-3 space-y-3 text-sm text-slate-600">
                  <div>
                    <dt className="font-semibold text-slate-800">C₁ &times; V₁ = C₂ &times; V₂</dt>
                    <dd className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      Where C₁ is stock concentration, V₁ is required stock volume, C₂ is target concentration, and V₂ is target total volume.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-800">Diluent Volume</dt>
                    <dd className="mt-0.5 font-mono text-slate-500">
                      Diluent = V₂ &minus; V₁
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-800">Rule of Dilution</dt>
                    <dd className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      The stock concentration (C₁) must always be greater than or equal to the desired final concentration (C₂).
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
                Fill in stock concentration, required concentration, and final volume.
              </p>
              <div className="mt-6">
                <DilutionCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
