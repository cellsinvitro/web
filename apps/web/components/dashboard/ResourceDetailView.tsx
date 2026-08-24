"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StudyMaterialViewer from "@/components/StudyMaterialViewer";
import {
  fetchStudyMaterial,
  getStudyMaterialViewUrl,
} from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";

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
      const data = await fetchStudyMaterial(materialId);
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
        <p className="mt-10 text-sm text-slate-500">Loading resource...</p>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : material ? (
        <>
          <div className="mt-8 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Resource Library
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
              View-only preview. This content can only be read on this page.
            </p>
          </div>

          <div className="mt-8">
            <StudyMaterialViewer
              materialId={material.id}
              mimeType={material.mimeType}
              title={material.title}
              viewUrl={getStudyMaterialViewUrl(material.id)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
