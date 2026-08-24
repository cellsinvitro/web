"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ResourceFileGrid from "@/components/ResourceFileGrid";
import {
  addAdminStudyMaterialFiles,
  deleteAdminStudyMaterial,
  deleteAdminStudyMaterialFile,
  fetchStudyMaterial,
  updateAdminStudyMaterial,
} from "@/lib/api";
import type { StudyMaterial } from "@/lib/api";
import {
  formatResourceDate,
  getMaterialFileCountLabel,
  getMaterialTypeSummary,
} from "@/lib/resources";

export default function AdminResourceDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const materialId = params.id;

  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadMaterial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudyMaterial(materialId);
      setMaterial(data);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setCategory(data.category ?? "");
      setNewFiles(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resource");
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    loadMaterial();
  }, [loadMaterial]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!material) return;

    setSaving(true);
    setActionError(null);
    try {
      const updated = await updateAdminStudyMaterial(material.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
      });
      setMaterial(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? "");
      setCategory(updated.category ?? "");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update resource"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddFiles = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!material || !newFiles || newFiles.length === 0) {
      setActionError("Please choose at least one file to upload.");
      return;
    }

    setUploadingFiles(true);
    setActionError(null);
    try {
      const updated = await addAdminStudyMaterialFiles(
        material.id,
        Array.from(newFiles)
      );
      setMaterial(updated);
      setNewFiles(null);
      form.reset();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to upload files"
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!material) return;

    if (!window.confirm("Remove this file from the resource?")) {
      return;
    }

    setDeletingFileId(fileId);
    setActionError(null);
    try {
      const updated = await deleteAdminStudyMaterialFile(material.id, fileId);
      setMaterial(updated);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove file"
      );
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDelete = async () => {
    if (!material) return;

    if (
      !window.confirm(`Delete "${material.title}"? This cannot be undone.`)
    ) {
      return;
    }

    setDeleting(true);
    setActionError(null);
    try {
      await deleteAdminStudyMaterial(material.id);
      router.push("/admin/resources");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete resource"
      );
    } finally {
      setDeleting(false);
    }
  };

  const isBusy = saving || uploadingFiles || deleting || deletingFileId !== null;

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/resources"
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
        <div className="mt-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Edit resource
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {material.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {getMaterialTypeSummary(material.files)} ·{" "}
                {getMaterialFileCountLabel(material.files.length)} · Added{" "}
                {formatResourceDate(material.createdAt)}
              </p>
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDelete}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete resource"}
            </button>
          </div>

          {actionError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Files</h2>
            <ResourceFileGrid
              materialId={material.id}
              files={material.files}
              showDelete={material.files.length > 1}
              onDeleteFile={handleDeleteFile}
              deletingFileId={deletingFileId}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Add more files
              </h2>
              <form onSubmit={handleAddFiles} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Upload files
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => setNewFiles(event.target.files)}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
                  />
                  <span className="mt-1.5 block text-xs text-slate-400">
                    PDF or images up to 15 MB each.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingFiles ? "Uploading..." : "Add files"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Resource details
              </h2>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                    placeholder="Brief summary of this resource"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save details"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
