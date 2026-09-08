"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchStudyMaterials } from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import ResourcePurchaseButton from "@/components/resources/ResourcePurchaseButton";
import {
  formatResourceDate,
  getMaterialFileCountLabel,
  getMaterialTypeSummary,
} from "@/lib/resources";

import GlobalLoader from "@/components/GlobalLoader";

type ResourceLibraryListProps = {
  basePath?: string;
  showHeader?: boolean;
  limit?: number;
};

export default function ResourceLibraryList({
  basePath = "/dashboard/resources",
  showHeader = true,
  limit,
}: ResourceLibraryListProps) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [libraryPrice, setLibraryPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { materials: data, libraryPrice: lPrice } = await fetchStudyMaterials();
      setMaterials(limit ? data.slice(0, limit) : data);
      setLibraryPrice(lPrice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const hasFullAccess = materials.length > 0 && materials.every((m) => m.hasAccess);

  return (
    <div>
      {showHeader ? (
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Resource Library
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Study materials
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Protocols, guides, and reference documents curated for members.
              Purchase full library pass, module sets, or individual file parts.
            </p>
          </div>

          {!loading && libraryPrice > 0 && !hasFullAccess ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm md:w-72">
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900">
                Full Access Pass
              </span>
              <p className="mt-1 text-xs font-semibold text-slate-950">
                Unlock Whole Library
              </p>
              <div className="mt-3">
                <ResourcePurchaseButton
                  resourceScope="FULL_LIBRARY"
                  price={libraryPrice}
                  label={`Buy Library Pass - ₹${libraryPrice}`}
                  className="w-full justify-center rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-amber-400"
                  onSuccess={loadMaterials}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <GlobalLoader fullScreen={false} sublabel="Loading resources..." />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : materials.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            No study materials have been published yet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {materials.map((material) => {
            const modPrice = material.price ?? 0;
            const isUnlocked = material.hasAccess;

            return (
              <li key={material.id}>
                <Link
                  href={`${basePath}/${material.id}`}
                  className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {getMaterialTypeSummary(material.files)}
                      </span>
                      {material.category ? (
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {material.category}
                        </span>
                      ) : null}
                    </div>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Unlocked
                      </span>
                    ) : modPrice > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                        Module: ₹{modPrice}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        Free
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 group-hover:text-slate-800">
                    {material.title}
                  </h2>
                  {material.description ? (
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                      {material.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                    <span>{getMaterialFileCountLabel(material.files.length)}</span>
                    <span>{formatResourceDate(material.createdAt)}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                    View material & parts
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
