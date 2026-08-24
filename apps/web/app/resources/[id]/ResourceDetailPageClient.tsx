"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResourceFileGrid from "@/components/ResourceFileGrid";
import { fetchStudyMaterial } from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import {
  getMaterialFileCountLabel,
  getMaterialTypeSummary,
} from "@/lib/resources";

export default function ResourceDetailPageClient() {
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
    <main>
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Link
            href="/resources"
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
            Back to Resource Library
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
                  {getMaterialTypeSummary(material.files)} ·{" "}
                  {getMaterialFileCountLabel(material.files.length)}. View-only
                  preview. Click a file to open it.
                </p>
              </div>

              <div className="mt-8">
                <ResourceFileGrid
                  materialId={material.id}
                  files={material.files}
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}
