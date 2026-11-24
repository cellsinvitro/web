"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolsSubscriptionPanel from "@/components/tools/ToolsSubscriptionPanel";
import ToolUsageBar from "@/components/tools/ToolUsageBar";
import { fetchToolsStatus, type ToolsStatusResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ToolsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ToolsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    try {
      const data = await fetchToolsStatus();
      setStatus(data);
    } catch (err) {
      console.error("Failed to load tools status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [user]);

  const calculators = [
    {
      id: "ic50",
      order: 1,
      href: "/tools/ic50",
      title: "IC₅₀ Calculator",
      tag: "Assay Analysis",
      description:
        "Fit dose-response inhibition data using non-linear 4-parameter logistic regression (4PL). Calculate precise IC₅₀/EC₅₀ values and export high-resolution publication charts.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-slate-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 19.5h18M3.75 4.5v15M6 16.5c3-1 6-7 9-7s4.5 3 6 4.5" />
          <circle cx="6" cy="16.5" r="1.5" className="fill-slate-900" />
          <circle cx="10.5" cy="11" r="1.5" className="fill-slate-900" />
          <circle cx="15" cy="9.5" r="1.5" className="fill-slate-900" />
          <circle cx="21" cy="14" r="1.5" className="fill-slate-900" />
        </svg>
      ),
    },
    {
      id: "cell-counting",
      order: 2,
      href: "/tools/cell-counting",
      title: "Cell Counting Calculator",
      tag: "Cell Culture",
      description:
        "Standard hemocytometer grid calculations. Compute cell concentration (cells/mL), total cells across your sample volume, and trypan blue cell viability percentage.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-slate-800">
          <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeDasharray="1.5 2" />
          <circle cx="6" cy="6" r="1.2" className="fill-slate-900" />
          <circle cx="12" cy="12" r="1.2" className="fill-slate-900" />
          <circle cx="18" cy="12" r="1.2" className="fill-slate-900" />
          <circle cx="12" cy="18" r="1.2" className="fill-slate-900" />
        </svg>
      ),
    },
    {
      id: "molarity",
      order: 3,
      href: "/tools/molarity",
      title: "Molarity Calculator",
      tag: "Solution Prep",
      description:
        "Calculate required solute mass or resulting solution concentration. Full multi-unit conversions across µg, mg, g, µM, mM, and M for laboratory reagents.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-slate-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75h4.5M10.5 3.75v4.875L5.25 18a2.25 2.25 0 0 0 1.95 3.375h9.6a2.25 2.25 0 0 0 1.95-3.375L13.5 8.625V3.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h9" strokeDasharray="2 2" />
        </svg>
      ),
    },
    {
      id: "dilution",
      order: 4,
      href: "/tools/dilution",
      title: "Dilution Calculator",
      tag: "Solution Prep",
      description:
        "Solve C₁V₁ = C₂V₂ for stock solution volume and diluent required. Supports molar concentrations (µM, mM, M) and mass concentrations (µg/mL, mg/mL).",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-slate-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50/40">
      <Navbar />

      <section className="pt-28 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header section */}
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Lab Tools & Bench Utilities
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Scientific Calculators{" "}
              <span className="text-slate-500 font-semibold">for the Bench</span>
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Practical scientific calculators for cell culture, assay analysis, and laboratory workflows.
            </p>
          </div>

          {/* User Allowance & Quota Status Bar */}
          <div className="mt-6 max-w-7xl">
            <ToolUsageBar
              status={status}
              loading={loading}
              authenticated={Boolean(user)}
            />
          </div>

          {/* Main Grid: Left = Subscription Panel, Right = 2x2 Calculator Cards */}
          <div className="mt-10 grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Column: Subscription Panel (5 cols on lg) */}
            <div className="lg:col-span-4 xl:col-span-4">
              <div className="sticky top-28">
                <ToolsSubscriptionPanel
                  status={status}
                  onSubscriptionSuccess={loadStatus}
                />
              </div>
            </div>

            {/* Right Column: 2x2 Calculator Cards (8 cols on lg) */}
            <div className="lg:col-span-8 xl:col-span-8">
              <div className="grid gap-5 sm:grid-cols-2">
                {calculators.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-2xs transition-colors group-hover:bg-slate-100">
                          {tool.icon}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {tool.tag}
                        </span>
                      </div>

                      <h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950 group-hover:text-slate-800 transition-colors">
                        {tool.title}
                      </h2>
                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                        {tool.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-slate-950">
                        Open tool
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-700 transition-transform duration-150 group-hover:translate-x-1 group-hover:bg-slate-950 group-hover:text-white">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path
                            fillRule="evenodd"
                            d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
