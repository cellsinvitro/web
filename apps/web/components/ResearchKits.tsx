"use client";

import { useState } from "react";
import Image from "next/image";

type KitCategory =
  | "All"
  | "Anti-Cancer"
  | "Anti-Oxidant"
  | "Anti-Diabetic";

type ResearchKit = {
  category: Exclude<KitCategory, "All">;
  title: string;
  image: string;
  assays: string[];
};

const filters: KitCategory[] = [
  "All",
  "Anti-Cancer",
  "Anti-Oxidant",
  "Anti-Diabetic",
];

const researchKits: ResearchKit[] = [
  {
    category: "Anti-Cancer",
    title: "Anti-Cancer Assay Kits",
    image: "/images/kits/anti-cancer.png",
    assays: ["SRB Assay Kit", "MTT Assay Kit"],
  },
  {
    category: "Anti-Oxidant",
    title: "Anti-Oxidant Assay Kits",
    image: "/images/kits/anti-oxidant.png",
    assays: [
      "H2O2 Scavenging Assay Kit",
      "Reducing Power Assay Kit",
    ],
  },
  {
    category: "Anti-Diabetic",
    title: "Anti-Diabetic Assay Kits",
    image: "/images/kits/anti-diabetic.png",
    assays: [
      "Alpha-Amylase Inhibition Kit",
      "Alpha-Glucosidase Assay Kit",
    ],
  },
];

export default function ResearchKits() {
  const [activeFilter, setActiveFilter] =
    useState<KitCategory>("All");

  const filteredKits =
    activeFilter === "All"
      ? researchKits
      : researchKits.filter(
          (kit) => kit.category === activeFilter
        );

  return (
    <section
      id="kits"
      className="relative overflow-hidden bg-slate-50 py-14 sm:py-16 lg:py-20"
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-100/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

        {/* ================= HEADER ================= */}
        <div className="mx-auto max-w-3xl text-center">

          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Research Solutions
          </span>

          <h2 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Kits for Research Use
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Explore our assay-based research kits developed for
            cellular, antioxidant, and metabolic research
            applications.
          </p>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/10"
                    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* ================= KIT CARDS ================= */}
        <div
          className={`mt-8 grid gap-5 ${
            filteredKits.length === 1
              ? "mx-auto max-w-md"
              : "md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {filteredKits.map((kit, index) => (
            <article
              key={kit.category}
              className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5"
            >
              {/* ================= IMAGE ================= */}
              <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-slate-100">
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={kit.image}
                    alt={kit.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={
                      index === 0 && activeFilter === "All"
                    }
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              </div>

              {/* ================= CONTENT ================= */}
              <div className="p-5">

                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {kit.category}
                </p>

                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {kit.title}
                </h3>

                {/* Assays */}
                <div className="mt-4 space-y-2.5">
                  {kit.assays.map((assay) => (
                    <div
                      key={assay}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-600"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{assay}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Coming Soon
                  </span>

                  <span className="text-slate-400 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ================= BOTTOM NOTE ================= */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 sm:text-sm">
            Research use only. Product availability will be announced soon.
          </p>
        </div>

      </div>
    </section>
  );
}