"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ResourceFileGrid from "@/components/ResourceFileGrid";
import { fetchStudyMaterial } from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import {
  getMaterialFileCountLabel,
  getMaterialTypeSummary,
} from "@/lib/resources";
import GlobalLoader from "@/components/GlobalLoader";

import ResourcePurchaseButton from "@/components/resources/ResourcePurchaseButton";

type ResourceDetailViewProps = {
  backHref?: string;
  backLabel?: string;
};

export default function ResourceDetailView({
  backHref = "/dashboard/resources",
  backLabel = "Back to Resource Library",
}: ResourceDetailViewProps) {
  const params = useParams<{ id: string }>();
  const materialId = params.id;
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { material: data } = await fetchStudyMaterial(materialId);
      setMaterial(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resource");
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    loadMaterial();
  }, [loadMaterial]);

  const modPrice = material?.price ?? 0;
  const isUnlocked = material?.hasAccess;

  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
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
        {backLabel}
      </Link>

      {loading ? (
        <GlobalLoader fullScreen={false} sublabel="Loading resource..." />
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : material ? (
        <>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Resource Module
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {material.title}
              </h1>
              {material.description ? (
                <p className="mt-4 text-base leading-7 text-slate-500">
                  {material.description}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-slate-400">
                {getMaterialTypeSummary(material.files)} ·{" "}
                {getMaterialFileCountLabel(material.files.length)}. You can purchase the whole module set or individual parts below.
              </p>
            </div>

            {!isUnlocked && modPrice > 0 ? (
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm md:w-72">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Whole Module Pass
                </span>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  ₹{modPrice}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Unlocks all {material.files.length} files in this module
                </p>
                <div className="mt-4">
                  <ResourcePurchaseButton
                    resourceScope="MODULE"
                    studyMaterialId={material.id}
                    price={modPrice}
                    label={`Buy Module Set - ₹${modPrice}`}
                    className="w-full justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                    onSuccess={loadMaterial}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <ResourceFileGrid
              materialId={material.id}
              files={material.files}
              onPurchaseSuccess={loadMaterial}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
