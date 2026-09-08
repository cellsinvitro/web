"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchKitTree, fetchKits } from "@/lib/api";
import type { KitModuleNode, ResearchKit } from "@/lib/api";
import KitModuleTree from "@/components/KitModuleTree";
import { KIT_CATEGORIES } from "@/lib/kits";
import GlobalLoader from "@/components/GlobalLoader";

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
  const [tree, setTree] = useState<KitModuleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<KitFilter>("All");

  const loadKits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, moduleTree] = await Promise.all([fetchKits(), fetchKitTree()]);
      setKits(data);
      setTree(moduleTree);
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
        <GlobalLoader fullScreen={false} sublabel="Loading research kits..." />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : filteredKits.length === 0 && tree.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            No kits available in this category yet.
          </p>
        </div>
      ) : <KitModuleTree tree={tree} ungroupedKits={filteredKits} />}
    </div>
  );
}
