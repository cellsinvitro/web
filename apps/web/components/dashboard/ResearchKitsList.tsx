"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { fetchKits } from "@/lib/api";
import type { ResearchKit } from "@/lib/api";
import { KIT_CATEGORIES } from "@/lib/kits";

type KitFilter = "All" | (typeof KIT_CATEGORIES)[number];

const filters: KitFilter[] = ["All", ...KIT_CATEGORIES];

type ResearchKitsListProps = {
  showHeader?: boolean;
  limit?: number;
};

export default function ResearchKitsList({
  showHeader = true,
  limit,
}: ResearchKitsListProps) {
  const [kits, setKits] = useState<ResearchKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<KitFilter>("All");

  const loadKits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKits();
      setKits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load kits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKits();
  }, [loadKits]);

  const filteredKits = useMemo(() => {
    const categoryFiltered =
      activeFilter === "All"
        ? kits
        : kits.filter((kit) => kit.category === activeFilter);

    return limit ? categoryFiltered.slice(0, limit) : categoryFiltered;
  }, [activeFilter, kits, limit]);

  return (
    <div>
      {showHeader ? (
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Research Kits
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Kits for research use
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Assay-based research kits for cellular, antioxidant, and metabolic
            research applications.
          </p>
        </div>
      ) : null}

      {!limit ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading kits...</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : filteredKits.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            No kits available in this category yet.
          </p>
        </div>
      ) : (
        <ul
          className={`grid gap-5 ${
            filteredKits.length === 1
              ? "max-w-md"
              : "sm:grid-cols-2 xl:grid-cols-3"
          }`}
        >
          {filteredKits.map((kit) => (
            <li key={kit.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
                <div className="relative aspect-video w-full bg-slate-100">
                  {kit.imageUrl ? (
                    <Image
                      src={kit.imageUrl}
                      alt={kit.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 w-fit">
                    {kit.category}
                  </span>

                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                    {kit.title}
                  </h2>

                  <ul className="mt-4 flex-1 space-y-2">
                    {kit.assays.map((assay) => (
                      <li
                        key={assay}
                        className="flex items-start gap-2.5 text-sm leading-6 text-slate-500"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>{assay}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Coming soon
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
