"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formatFileSize,
  formatResourceDate,
  getMaterialFileCountLabel,
  getMaterialTotalSize,
  getMaterialTypeSummary,
} from "@/lib/resources";
import { useConfirm } from "@/context/ConfirmContext";

export default function AdminResourceDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const materialId = params.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadMaterial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudyMaterial(materialId);
      setMaterial(data);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setCategory(data.category ?? "");
      setPendingFiles([]);
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

  const isDirty = useMemo(() => {
    if (!material) return false;
    return (
      title.trim() !== material.title ||
      description.trim() !== (material.description ?? "") ||
      category.trim() !== (material.category ?? "")
    );
  }, [material, title, description, category]);

  const isBusy =
    saving || uploadingFiles || deleting || deletingFileId !== null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!material) return;

    setSaving(true);
    setActionError(null);
    setSavedAt(null);
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
      setSavedAt("Details saved");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update resource"
      );
    } finally {
      setSaving(false);
    }
  };

  const queueFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const next = Array.from(files);
    if (next.length === 0) return;
    setPendingFiles((prev) => [...prev, ...next]);
    setActionError(null);
  };

  const handleAddFiles = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!material || pendingFiles.length === 0) {
      setActionError("Please choose at least one file to upload.");
      return;
    }

    setUploadingFiles(true);
    setActionError(null);
    try {
      const updated = await addAdminStudyMaterialFiles(
        material.id,
        pendingFiles
      );
      setMaterial(updated);
      setPendingFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

    const confirmed = await confirm({
      title: "Remove file",
      message: "Remove this file from the resource?",
      confirmLabel: "Remove file",
      variant: "danger",
    });
    if (!confirmed) return;

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

    const confirmed = await confirm({
      title: "Delete resource",
      message: `Delete "${material.title}"? This cannot be undone.`,
      confirmLabel: "Delete resource",
      variant: "danger",
    });
    if (!confirmed) return;

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
        Resource Library
      </Link>

      {loading ? (
        <div className="mt-8 space-y-4">
          <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : material ? (
        <div className="mt-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Edit resource
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {material.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {material.category ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {material.category}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Uncategorized
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {getMaterialTypeSummary(material.files)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {getMaterialFileCountLabel(material.files.length)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {formatFileSize(getMaterialTotalSize(material.files))}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Added {formatResourceDate(material.createdAt)} · Updated{" "}
                  {formatResourceDate(material.updatedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/resources/${material.id}`}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Preview as user
                </Link>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete resource"}
                </button>
              </div>
            </div>
          </header>

          {actionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          ) : null}

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Files
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Preview, download, or remove files in this resource.
                    </p>
                  </div>
                </div>
                <ResourceFileGrid
                  materialId={material.id}
                  files={material.files}
                  showDelete={material.files.length > 1}
                  onDeleteFile={handleDeleteFile}
                  deletingFileId={deletingFileId}
                />
              </div>

              <form
                onSubmit={handleAddFiles}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-lg font-semibold text-slate-950">
                  Add more files
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  PDF or images, up to 15 MB each.
                </p>

                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    queueFiles(event.dataTransfer.files);
                  }}
                  className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center transition-colors ${
                    isDragging
                      ? "border-slate-950 bg-slate-50"
                      : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => queueFiles(event.target.files)}
                    className="sr-only"
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <path
                      d="M12 16V8m0 0 3.5 3.5M12 8 8.5 11.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 16.5v.75A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25v-.75"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-slate-800">
                    Drop files here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PDF, JPG, PNG, WebP, or GIF
                  </p>
                </label>

                {pendingFiles.length > 0 ? (
                  <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {pendingFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            setPendingFiles((prev) =>
                              prev.filter((_, fileIndex) => fileIndex !== index)
                            )
                          }
                          className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <button
                  type="submit"
                  disabled={isBusy || pendingFiles.length === 0}
                  className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingFiles
                    ? "Uploading..."
                    : pendingFiles.length > 0
                      ? `Upload ${pendingFiles.length} file${pendingFiles.length === 1 ? "" : "s"}`
                      : "Upload files"}
                </button>
              </form>
            </section>

            <aside className="lg:sticky lg:top-6">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Details
                  </h2>
                  {isDirty ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Unsaved
                    </span>
                  ) : savedAt ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {savedAt}
                    </span>
                  ) : null}
                </div>

                <label className="mt-5 block">
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

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                  </span>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setSavedAt(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                    placeholder="Protocols"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setSavedAt(null);
                    }}
                    rows={6}
                    className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
                    placeholder="Brief summary of this resource"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isBusy || !isDirty}
                  className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save details"}
                </button>
              </form>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
