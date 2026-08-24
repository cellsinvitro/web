"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchStudyMaterials } from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  return "File";
}

export default function ResourcesPageClient() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudyMaterials();
      setMaterials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  return (
    <main>
      <Navbar />

      <section className="bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Resource Library
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Study materials
              <span className="text-slate-500"> for your research.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Protocols, guides, and reference documents curated by our team.
              All content is view-only within this library.
            </p>
          </div>

          {loading ? (
            <p className="mt-12 text-sm text-slate-500">Loading resources...</p>
          ) : error ? (
            <div className="mt-12 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : materials.length === 0 ? (
            <div className="mt-12 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <p className="text-sm text-slate-500">
                No study materials have been published yet.
              </p>
            </div>
          ) : (
            <ul className="mt-12 grid gap-5 sm:grid-cols-2">
              {materials.map((material) => (
                <li key={material.id}>
                  <Link
                    href={`/resources/${material.id}`}
                    className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {getTypeLabel(material.mimeType)}
                      </span>
                      {material.category ? (
                        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {material.category}
                        </span>
                      ) : null}
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
                      <span>{formatFileSize(material.fileSize)}</span>
                      <span>{formatDate(material.createdAt)}</span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                      View material
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
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
