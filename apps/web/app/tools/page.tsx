import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MolarityCalculator from "@/components/MolarityCalculator";

export const metadata: Metadata = {
  title: "Lab Tools | CellsInVitro",
  description:
    "Free lab calculators for cell culture and molecular biology workflows, including molarity and dilution.",
};

export default function ToolsPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full border border-slate-200/70"
        />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mt-7 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
            <aside className="space-y-6">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Lab Tools
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Molarity
                  <span className="text-slate-500"> calculator.</span>
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-500">
                  Quickly calculate solution concentration, solute mass, or
                  dilution volumes for your bench work — no sign-up required.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold text-slate-950">
                  Quick reference
                </h2>
                <dl className="mt-3 space-y-3 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-800">Molarity</dt>
                    <dd className="mt-0.5 font-mono text-slate-500">
                      M = (mass / MW) / volume
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-800">Mass</dt>
                    <dd className="mt-0.5 font-mono text-slate-500">
                      mass = M × MW × volume
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-800">Dilution</dt>
                    <dd className="mt-0.5 font-mono text-slate-500">
                      C₁V₁ = C₂V₂
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Calculator
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Results update as you type.
              </p>
              <div className="mt-6">
                <MolarityCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
