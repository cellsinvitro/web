"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchKit } from "@/lib/api";
import type { ResearchKit } from "@/lib/api";

export default function KitDetailsPage() {
  const params = useParams<{ id: string }>();
  const [kit, setKit] = useState<ResearchKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchKit(params.id)
      .then((data) => {
        if (!cancelled) setKit(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load kit");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/kits"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
        >
          <span aria-hidden="true">←</span>
          Back to research kits
        </Link>

        {loading ? (
          <div className="mt-8 h-128 animate-pulse rounded-4xl bg-white" />
        ) : error ? (
          <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : kit ? (
          <article className="mt-8 overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative h-64 overflow-hidden rounded-2xl bg-slate-100 lg:my-8 lg:ml-8 lg:h-104 lg:rounded-3xl">
                {kit.imageUrl ? (
                  <Image
                    src={kit.imageUrl}
                    alt={kit.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    No image available
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/60 to-transparent px-6 pb-6 pt-16 text-xs font-semibold uppercase tracking-[0.2em] text-white/85 sm:px-9">
                  Research use only
                </div>
              </div>

              <div className="flex flex-col p-7 sm:p-10 lg:p-10">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {kit.category}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Assay kit
                  </span>
                </div>

                <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  {kit.title}
                </h1>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Included assays
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {kit.assays.map((assay) => (
                      <li key={assay} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        {assay}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Availability
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Contact the CellsInVitro team for availability, technical questions, and research support.
                  </p>
                  <Link
                    href="/contact"
                    className="mt-4 inline-flex text-sm font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-950"
                  >
                    Contact the team
                  </Link>
                </div>
              </div>
            </div>

            <section className="border-t border-slate-200 px-7 py-8 sm:px-10 sm:py-10 lg:px-12">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Kit information
                </p>
                {kit.details ? (
                  <div className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-slate-600">
                    {kit.details}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 text-slate-500">
                    Detailed information for this kit will be added soon.
                  </p>
                )}
              </div>
            </section>
          </article>
        ) : null}
      </div>
    </main>
  );
}