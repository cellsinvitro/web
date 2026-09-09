"use client";

import { useState } from "react";
import StudyMaterialViewer from "@/components/StudyMaterialViewer";
import type { StudyMaterialFile } from "@/lib/api";
import {
  downloadStudyMaterialFile,
  getStudyMaterialFileViewUrl,
} from "@/lib/api";
import { formatFileSize, getResourceTypeLabel } from "@/lib/resources";

import ResourcePurchaseButton from "@/components/resources/ResourcePurchaseButton";

type ResourceFileGridProps = {
  materialId: string;
  files: StudyMaterialFile[];
  showDelete?: boolean;
  onDeleteFile?: (fileId: string) => void;
  deletingFileId?: string | null;
  showPriceEditor?: boolean;
  onUpdateFilePrice?: (fileId: string, price: number) => Promise<void>;
  onPurchaseSuccess?: () => void;
};

export default function ResourceFileGrid({
  materialId,
  files,
  showDelete = false,
  onDeleteFile,
  deletingFileId = null,
  showPriceEditor = false,
  onUpdateFilePrice,
  onPurchaseSuccess,
}: ResourceFileGridProps) {
  const [selectedFile, setSelectedFile] = useState<StudyMaterialFile | null>(
    null
  );
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null
  );
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<string>("0");
  const [savingPrice, setSavingPrice] = useState(false);

  const handleDownload = async (file: StudyMaterialFile) => {
    setDownloadingFileId(file.id);
    try {
      await downloadStudyMaterialFile(materialId, file);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const startEditPrice = (file: StudyMaterialFile) => {
    setEditingFileId(file.id);
    setEditPriceVal(String(file.price ?? 0));
  };

  const saveFilePrice = async (fileId: string) => {
    if (!onUpdateFilePrice) return;
    setSavingPrice(true);
    try {
      await onUpdateFilePrice(fileId, Math.max(0, Math.floor(Number(editPriceVal) || 0)));
      setEditingFileId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrice(false);
    }
  };

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
          const isLocked = file.hasAccess === false;
          const filePrice = file.price ?? 0;

          return (
            <div
              key={file.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className="block w-full text-left cursor-pointer"
                >
                  <div className="relative aspect-4/3 bg-slate-50">
                    {isImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={viewUrl}
                        alt={file.fileName}
                        className={`h-full w-full object-cover select-none${isLocked ? " blur-lg brightness-50 pointer-events-none" : ""}`}
                        draggable={false}
                        onContextMenu={(e) => isLocked && e.preventDefault()}
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

                    {isLocked ? (
                      <>
                        {/* Lock badge */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-amber-300 backdrop-blur-sm shadow-md">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                          </svg>
                          Preview Mode
                        </div>
                        {/* Centred lock icon overlay on blurred image thumbnails */}
                        {isImage ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none select-none">
                            <div className="rounded-full bg-white/10 p-3 backdrop-blur-sm">
                              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="h-7 w-7 drop-shadow-lg">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            </div>
                            <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider drop-shadow">Purchase to view</span>
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    {!isLocked ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur-sm">
                          Click to Preview
                        </span>
                      </div>
                    ) : null}
                  </div>
                </button>
              </div>

              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-950">
                  {file.fileName}
                </p>
                <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {getResourceTypeLabel(file.mimeType)} · {formatFileSize(file.fileSize)}
                  </span>
                  {filePrice > 0 ? (
                    <span className="font-semibold text-slate-900">Part: ₹{filePrice}</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Part Free</span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(file)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400">
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                    </svg>
                    Preview
                  </button>

                  {isLocked ? (
                    <ResourcePurchaseButton
                      resourceScope="FILE"
                      studyMaterialId={materialId}
                      studyMaterialFileId={file.id}
                      price={filePrice}
                      label={`Buy - ₹${filePrice}`}
                      className="flex-1 justify-center rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
                      onSuccess={() => {
                        setSelectedFile(null);
                        onPurchaseSuccess?.();
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={downloadingFileId === file.id}
                      onClick={() => handleDownload(file)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.69L6.22 8.22a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06l-2.47 2.47V2.75Z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18.5h10.5a2.75 2.75 0 0 0 2.75-2.75v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                      </svg>
                      {downloadingFileId === file.id ? "Downloading..." : "Download"}
                    </button>
                  )}
                </div>
              </div>

              {showPriceEditor && onUpdateFilePrice ? (
                <div className="border-t border-slate-100 bg-slate-50/50 p-2.5">
                  {editingFileId === file.id ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1.5 text-xs font-semibold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white pl-5 pr-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-950"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingPrice}
                        onClick={() => saveFilePrice(file.id)}
                        className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                      >
                        {savingPrice ? "..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFileId(null)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditPrice(file)}
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <span>Part Price: ₹{filePrice}</span>
                      <span className="text-slate-500 font-normal">Edit</span>
                    </button>
                  )}
                </div>
              ) : null}

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
              <div className="flex items-center gap-2 min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">
                  {selectedFile.fileName}
                </p>
                {selectedFile.hasAccess === false ? (
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                    Preview Only
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {selectedFile.hasAccess === false ? (
                  <ResourcePurchaseButton
                    resourceScope="FILE"
                    studyMaterialId={materialId}
                    studyMaterialFileId={selectedFile.id}
                    price={selectedFile.price ?? 0}
                    label={`Buy Part to Download - ₹${selectedFile.price ?? 0}`}
                    className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                    onSuccess={() => {
                      setSelectedFile(null);
                      onPurchaseSuccess?.();
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={downloadingFileId === selectedFile.id}
                    onClick={() => handleDownload(selectedFile)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.69L6.22 8.22a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 0 0-1.06-1.06l-2.47 2.47V2.75Z"
                      />
                      <path
                        d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18.5h10.5a2.75 2.75 0 0 0 2.75-2.75v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
                      />
                    </svg>
                    {downloadingFileId === selectedFile.id
                      ? "Downloading..."
                      : "Download"}
                  </button>
                )}

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
            </div>
            <div className="p-4">
              <StudyMaterialViewer
                materialId={selectedFile.id}
                mimeType={selectedFile.mimeType}
                title={selectedFile.fileName}
                viewUrl={`${getStudyMaterialFileViewUrl(materialId, selectedFile.id)}?t=${selectedFile.updatedAt}`}
                hasAccess={selectedFile.hasAccess !== false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
