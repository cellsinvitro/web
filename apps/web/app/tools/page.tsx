import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Lab Tools | CellsInVitro",
  description:
    "Free lab calculators for cell culture and molecular biology workflows, including molarity, dilution, and IC50 fitting.",
};

const tools = [
  {
    href: "/tools/molarity",
    title: "Molarity calculator",
    description:
      "Calculate concentration, solute mass, or dilution volumes for solution prep.",
    tag: "Solution prep",
  },
  {
    href: "/tools/ic50",
    title: "IC₅₀ calculator",
    description:
      "Fit dose-response inhibition data with four-parameter logistic regression.",
    tag: "Assay analysis",
  },
];

export default function ToolsPage() {
  return (
    <main>
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Lab Tools
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Free calculators
              <span className="text-slate-500"> for the bench.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Practical tools for everyday cell culture and assay workflows. No
              sign-up required.
            </p>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {tools.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {tool.tag}
                  </span>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 group-hover:text-slate-800">
                    {tool.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                    {tool.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                    Open tool
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
