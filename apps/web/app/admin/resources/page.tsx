"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteAdminStudyMaterial,
  fetchAdminStudyMaterials,
  fetchResourceLibrarySetting,
  updateResourceLibrarySetting,
  uploadAdminStudyMaterial,
} from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import { formatResourceDate, getMaterialFileCountLabel, getMaterialTypeSummary } from "@/lib/resources";
import { useConfirm } from "@/context/ConfirmContext";
import { AdminSpinner } from "@/components/AdminLoader";

export default function AdminResourcesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [originalPrice, setOriginalPrice] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const [libraryPrice, setLibraryPrice] = useState("0");
  const [libraryOriginalPrice, setLibraryOriginalPrice] = useState("");
  const [savingLibraryPrice, setSavingLibraryPrice] = useState(false);
  const [libraryPriceSavedMsg, setLibraryPriceSavedMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mats, setting] = await Promise.all([
        fetchAdminStudyMaterials(),
        fetchResourceLibrarySetting(),
      ]);
      setMaterials(mats);
      setLibraryPrice(String(setting.price || 0));
      setLibraryOriginalPrice(String(setting.originalPrice ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLibraryPrice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingLibraryPrice(true);
    setLibraryPriceSavedMsg(null);
    setActionError(null);
    try {
      const updated = await updateResourceLibrarySetting(Number(libraryPrice) || 0, libraryOriginalPrice.trim() ? Number(libraryOriginalPrice) : null);
      setLibraryPrice(String(updated.price));
      setLibraryOriginalPrice(String(updated.originalPrice ?? ""));
      setLibraryPriceSavedMsg("Whole Library Price updated successfully!");
      setTimeout(() => setLibraryPriceSavedMsg(null), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update whole library price");
    } finally {
      setSavingLibraryPrice(false);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!files || files.length === 0) {
      setActionError("Please choose at least one PDF or image file.");
      return;
    }

    setUploading(true);
    setActionError(null);
    try {
      const material = await uploadAdminStudyMaterial({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        price: Math.max(0, Math.floor(Number(price) || 0)),
        originalPrice: originalPrice.trim() ? Math.max(0, Math.floor(Number(originalPrice) || 0)) : null,
        files: Array.from(files),
      });
      setMaterials((prev) => [material, ...prev]);
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("0");
      setOriginalPrice("");
      setFiles(null);
      form.reset();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to upload resource"
      );
    } finally {
      setUploading(false);
    }
  };

  const openResource = (materialId: string) => {
    router.push(`/admin/resources/${materialId}`);
  };

  const handleDelete = async (material: StudyMaterial) => {
    const confirmed = await confirm({
      title: "Delete resource",
      message: `Delete "${material.title}"? This cannot be undone.`,
      confirmLabel: "Delete resource",
      variant: "danger",
    });
    if (!confirmed) return;

    setPendingId(material.id);
    setActionError(null);
    try {
      await deleteAdminStudyMaterial(material.id);
      setMaterials((prev) => prev.filter((item) => item.id !== material.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete resource"
      );
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
          Resource Library
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage prices for full library access, modules, and individual file parts.
        </p>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {/* Global Resource Library Price Card */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Whole Library Pass
            </span>
            <h2 className="mt-2 text-xl font-semibold">Full Library Price</h2>
            <p className="mt-1 text-xs text-slate-300">
              Setting a price here lets users buy full access to all current and future modules in the Resource Library. Set ₹0 for free access.
            </p>
          </div>
          <form onSubmit={handleSaveLibraryPrice} className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={libraryPrice}
                onChange={(e) => setLibraryPrice(e.target.value)}
                className="w-32 rounded-xl border border-slate-700 bg-slate-800/80 pl-7 pr-3 py-2 text-sm font-medium text-white outline-none focus:border-amber-400"
                placeholder="0"
              />
              <input
                type="number"
                min="0"
                value={libraryOriginalPrice}
                onChange={(e) => setLibraryOriginalPrice(e.target.value)}
                className="mt-2 w-32 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-white outline-none focus:border-amber-400"
                placeholder="Original"
              />
            </div>
            <button
              type="submit"
              disabled={savingLibraryPrice}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
            >
              {savingLibraryPrice ? "Saving..." : "Save Library Price"}
            </button>
          </form>
        </div>
        {libraryPriceSavedMsg ? (
          <p className="mt-3 text-xs font-medium text-emerald-400">{libraryPriceSavedMsg}</p>
        ) : null}
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Upload material (Module)</h2>
        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
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
                placeholder="Cell culture protocol"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </span>
              <input
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                placeholder="Protocols"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Module Price (Whole Set ₹)
              </span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                placeholder="0 for free"
              />
              <input
                type="number"
                min="0"
                value={originalPrice}
                onChange={(event) => setOriginalPrice(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                placeholder="Original price (optional)"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
              placeholder="Brief summary of this resource"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              File
            </span>
            <input
              type="file"
              required
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setFiles(event.target.files)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
            <span className="mt-1.5 block text-xs text-slate-400">
              Select one or more PDFs or images up to 15 MB each.
            </span>
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Publish resource"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Resource / Module</th>
                <th className="px-4 py-3 font-semibold">Module Price</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Files</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AdminSpinner size={36} />
                      <span className="text-xs text-slate-400">Loading resources…</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No resources uploaded yet.
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const isPending = pendingId === material.id;
                  const modPrice = material.price ?? 0;

                  return (
                    <tr
                      key={material.id}
                      onClick={() => openResource(material.id)}
                      className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-950">
                          {material.title}
                        </p>
                        {material.category ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {material.category}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {modPrice > 0 ? `₹${modPrice}` : <span className="font-medium text-emerald-600">Free</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {getMaterialTypeSummary(material.files)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {getMaterialFileCountLabel(material.files.length)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatResourceDate(material.createdAt)}
                      </td>
                      <td
                        className="px-4 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/resources/${material.id}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Edit & Part Prices
                          </Link>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(material)}
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
