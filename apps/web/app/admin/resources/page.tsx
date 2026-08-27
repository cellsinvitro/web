"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteAdminStudyMaterial,
  fetchAdminStudyMaterials,
  uploadAdminStudyMaterial,
} from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import { formatResourceDate, getMaterialFileCountLabel, getMaterialTypeSummary } from "@/lib/resources";
import { useConfirm } from "@/context/ConfirmContext";

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
  const [files, setFiles] = useState<FileList | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStudyMaterials();
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
        files: Array.from(files),
      });
      setMaterials((prev) => [material, ...prev]);
      setTitle("");
      setDescription("");
      setCategory("");
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
          Upload PDFs and images for logged-in users on the dashboard.
        </p>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Upload material</h2>
        <form onSubmit={handleUpload} className="mt-5 space-y-4">
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
                <th className="px-4 py-3 font-semibold">Resource</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Files</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Loading resources...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No resources uploaded yet.
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const isPending = pendingId === material.id;

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
                            Edit
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
