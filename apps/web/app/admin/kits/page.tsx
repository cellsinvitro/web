"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAdminKit,
  deleteAdminKit,
  fetchAdminKits,
} from "@/lib/api";
import type { ResearchKit } from "@/lib/api";
import {
  KIT_CATEGORIES,
  formatKitAssayCount,
  formatKitDate,
  parseAssaysText,
} from "@/lib/kits";
import { useConfirm } from "@/context/ConfirmContext";
import { AdminSpinner } from "@/components/AdminLoader";

export default function AdminKitsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [kits, setKits] = useState<ResearchKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(KIT_CATEGORIES[0]);
  const [assaysText, setAssaysText] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [image, setImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const previewImageUrl = useMemo(() => {
    if (!image) return null;
    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    if (!previewImageUrl?.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewImageUrl);
    };
  }, [previewImageUrl]);

  const loadKits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminKits();
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

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const assays = parseAssaysText(assaysText);
    if (!image) {
      setActionError("Please choose a kit image.");
      return;
    }

    if (assays.length === 0) {
      setActionError("Add at least one assay, one per line.");
      return;
    }

    setCreating(true);
    setActionError(null);
    try {
      const kit = await createAdminKit({
        title: title.trim(),
        category,
        assays,
        published,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        image,
      });
      setKits((prev) => [...prev, kit].sort((a, b) => a.sortOrder - b.sortOrder));
      setTitle("");
      setCategory(KIT_CATEGORIES[0]);
      setAssaysText("");
      setPublished(true);
      setSortOrder("0");
      setImage(null);
      event.currentTarget.reset();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create kit");
    } finally {
      setCreating(false);
    }
  };

  const openKit = (kitId: string) => {
    router.push(`/admin/kits/${kitId}`);
  };

  const handleDelete = async (kit: ResearchKit) => {
    const confirmed = await confirm({
      title: "Delete kit",
      message: `Delete "${kit.title}"? This cannot be undone.`,
      confirmLabel: "Delete kit",
      variant: "danger",
    });
    if (!confirmed) return;

    setPendingId(kit.id);
    setActionError(null);
    try {
      await deleteAdminKit(kit.id);
      setKits((prev) => prev.filter((item) => item.id !== kit.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete kit");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Content
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Research Kits
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage assay kit families shown on the public kits page.
        </p>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Add kit</h2>
        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="group relative block h-24 w-40 overflow-hidden rounded-xl bg-slate-100 text-left sm:h-28 sm:w-48"
          >
            {previewImageUrl ? (
              <Image
                src={previewImageUrl}
                alt={title.trim() || "Kit preview"}
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
              setImage(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            className="hidden"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Title
              </span>
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                placeholder="Anti-Cancer Assay Kits"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </span>
              <select
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              >
                {KIT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Assays
            </span>
            <textarea
              required
              value={assaysText}
              onChange={(event) => setAssaysText(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              placeholder={"SRB Assay Kit\nMTT Assay Kit"}
            />
            <span className="mt-1.5 block text-xs text-slate-400">
              Enter one assay name per line.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Sort order
              </span>
              <input
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              />
            </label>
            <label className="flex items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">
                Published on public kits page
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create kit"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Kit</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Assays</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AdminSpinner size={36} />
                      <span className="text-xs text-slate-400">Loading kits…</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : kits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No kits yet.
                  </td>
                </tr>
              ) : (
                kits.map((kit) => {
                  const isPending = pendingId === kit.id;

                  return (
                    <tr
                      key={kit.id}
                      onClick={() => openKit(kit.id)}
                      className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {kit.imageUrl ? (
                            <div className="relative h-12 w-20 overflow-hidden rounded-lg bg-slate-100">
                              <Image
                                src={kit.imageUrl}
                                alt={kit.title}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                              No image
                            </div>
                          )}
                          <p className="font-medium text-slate-950">{kit.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{kit.category}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatKitAssayCount(kit.assays.length)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            kit.published
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {kit.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatKitDate(kit.updatedAt)}
                      </td>
                      <td
                        className="px-4 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/kits/${kit.id}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(kit)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
