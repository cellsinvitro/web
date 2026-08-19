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
  const [activeFilter, setActiveFilter] = useState<KitCategory>("All");

  const filteredKits =
    activeFilter === "All"
      ? researchKits
      : researchKits.filter(
          (kit) => kit.category === activeFilter
        );

  return (
    <section
      id="kits"
      className="relative overflow-hidden bg-slate-50 py-24 sm:py-28 lg:py-32"
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Research Solutions
          </span>

          <h2 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Kits for Research Use
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Explore our assay-based research kits developed for
            cellular, antioxidant, and metabolic research
            applications.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
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

        {/* Kits */}
        <div
          className={`mt-14 grid gap-6 ${
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
              {/* Image */}
              <div className="relative mx-5 mt-5 overflow-hidden rounded-2xl bg-slate-100">
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={kit.image}
                    alt={kit.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index === 0 && activeFilter === "All"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {kit.category}
                </p>

                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {kit.title}
                </h3>

                {/* Assays */}
                <div className="mt-6 space-y-3">
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
                <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Research use only. Product availability will be announced
            soon.
          </p>
        </div>
      </div>
    </section>
  );
}