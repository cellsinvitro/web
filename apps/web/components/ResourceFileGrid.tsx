"use client";

import { useState } from "react";
import StudyMaterialViewer from "@/components/StudyMaterialViewer";
import type { StudyMaterialFile } from "@/lib/api";
import { getStudyMaterialFileViewUrl } from "@/lib/api";
import { formatFileSize, getResourceTypeLabel } from "@/lib/resources";

type ResourceFileGridProps = {
  materialId: string;
  files: StudyMaterialFile[];
  showDelete?: boolean;
  onDeleteFile?: (fileId: string) => void;
  deletingFileId?: string | null;
};

export default function ResourceFileGrid({
  materialId,
  files,
  showDelete = false,
  onDeleteFile,
  deletingFileId = null,
}: ResourceFileGridProps) {
  const [selectedFile, setSelectedFile] = useState<StudyMaterialFile | null>(
    null
  );

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        No files uploaded yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => {
          const isImage = file.mimeType.startsWith("image/");
          const viewUrl = `${getStudyMaterialFileViewUrl(materialId, file.id)}?t=${file.updatedAt}`;
          const isDeleting = deletingFileId === file.id;

          return (
            <div
              key={file.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
            >
              <button
                type="button"
                onClick={() => setSelectedFile(file)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[4/3] bg-slate-50">
                  {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={viewUrl}
                      alt={file.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-500">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-10 w-10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path
                          d="M7 4h7l3 3v13H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 4v3h3M9 12h6M9 16h4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        PDF
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-950">
                    {file.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getResourceTypeLabel(file.mimeType)} ·{" "}
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </button>

              {showDelete && onDeleteFile ? (
                <div className="border-t border-slate-100 px-3 py-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onDeleteFile(file.id)}
                    className="w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? "Removing..." : "Remove file"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedFile ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-950">
                {selectedFile.fileName}
              </p>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close preview"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <StudyMaterialViewer
                materialId={selectedFile.id}
                mimeType={selectedFile.mimeType}
                title={selectedFile.fileName}
                viewUrl={`${getStudyMaterialFileViewUrl(materialId, selectedFile.id)}?t=${selectedFile.updatedAt}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
