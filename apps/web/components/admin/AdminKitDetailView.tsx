"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  deleteAdminKit,
  fetchAdminKits,
  updateAdminKit,
} from "@/lib/api";
import type { ResearchKit } from "@/lib/api";
import {
  KIT_CATEGORIES,
  assaysToText,
  formatKitDate,
  parseAssaysText,
} from "@/lib/kits";

export default function AdminKitDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const kitId = params.id;

  const [kit, setKit] = useState<ResearchKit | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(KIT_CATEGORIES[0]);
  const [assaysText, setAssaysText] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadKit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const kits = await fetchAdminKits();
      const data = kits.find((item) => item.id === kitId) ?? null;
      if (!data) {
        throw new Error("Kit not found");
      }
      setKit(data);
      setTitle(data.title);
      setCategory(data.category);
      setAssaysText(assaysToText(data.assays));
      setPublished(data.published);
      setSortOrder(String(data.sortOrder));
      setPendingImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load kit");
      setKit(null);
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    loadKit();
  }, [loadKit]);

  const previewImageUrl = useMemo(() => {
    if (pendingImage) {
      return URL.createObjectURL(pendingImage);
    }
    return kit?.imageUrl ?? null;
  }, [kit?.imageUrl, pendingImage]);

  useEffect(() => {
    if (!pendingImage || !previewImageUrl?.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewImageUrl);
    };
  }, [pendingImage, previewImageUrl]);

  const isDirty = useMemo(() => {
    if (!kit) return false;
    return (
      title.trim() !== kit.title ||
      category !== kit.category ||
      assaysText.trim() !== assaysToText(kit.assays) ||
      published !== kit.published ||
      (Number.parseInt(sortOrder, 10) || 0) !== kit.sortOrder ||
      pendingImage !== null
    );
  }, [kit, title, category, assaysText, published, sortOrder, pendingImage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!kit) return;

    const assays = parseAssaysText(assaysText);
    if (assays.length === 0) {
      setActionError("Add at least one assay, one per line.");
      return;
    }

    setSaving(true);
    setActionError(null);
    setSavedAt(null);
    try {
      const updated = await updateAdminKit(kit.id, {
        title: title.trim(),
        category,
        assays,
        published,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        image: pendingImage ?? undefined,
      });
      setKit(updated);
      setTitle(updated.title);
      setCategory(updated.category);
      setAssaysText(assaysToText(updated.assays));
      setPublished(updated.published);
      setSortOrder(String(updated.sortOrder));
      setPendingImage(null);
      setSavedAt("Changes saved");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update kit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!kit) return;

    if (!window.confirm(`Delete "${kit.title}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setActionError(null);
    try {
      await deleteAdminKit(kit.id);
      router.push("/admin/kits");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete kit");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/kits"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        Research Kits
      </Link>

      {loading ? (
        <div className="mt-8 h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : kit ? (
        <div className="mt-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="group relative mb-5 block h-24 w-40 overflow-hidden rounded-xl bg-slate-100 text-left sm:h-28 sm:w-48"
            >
              {previewImageUrl ? (
                <Image
                  src={previewImageUrl}
                  alt={title}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2 text-slate-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                    />
                  </svg>
                  <span className="text-center text-[11px] font-medium leading-tight">
                    Click to add image
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-slate-950/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-900">
                  {previewImageUrl ? "Replace" : "Upload"}
                </span>
              </div>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                setPendingImage(event.target.files?.[0] ?? null);
                setSavedAt(null);
                event.target.value = "";
              }}
              className="hidden"
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Edit kit
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {kit.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {kit.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      kit.published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {kit.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Added {formatKitDate(kit.createdAt)} · Updated{" "}
                  {formatKitDate(kit.updatedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isDirty ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Unsaved changes
                  </span>
                ) : savedAt ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {savedAt}
                  </span>
                ) : null}
                <Link
                  href="/kits"
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  View public page
                </Link>
                <button
                  type="button"
                  disabled={deleting || saving}
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete kit"}
                </button>
              </div>
            </div>
          </header>

          {actionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the kit title, category, assays, and visibility.
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setSavedAt(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Category
                </span>
                <select
                  required
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setSavedAt(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                >
                  {KIT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Assays
                </span>
                <textarea
                  required
                  value={assaysText}
                  onChange={(event) => {
                    setAssaysText(event.target.value);
                    setSavedAt(null);
                  }}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Sort order
                  </span>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(event) => {
                      setSortOrder(event.target.value);
                      setSavedAt(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                  />
                </label>
                <label className="flex items-end gap-2 pb-2.5">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(event) => {
                      setPublished(event.target.checked);
                      setSavedAt(null);
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Published
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving || deleting || !isDirty}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
