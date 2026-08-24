"use client";

import { useEffect, useState } from "react";

type StudyMaterialViewerProps = {
  materialId: string;
  mimeType: string;
  title: string;
  viewUrl: string;
};

export default function StudyMaterialViewer({
  materialId,
  mimeType,
  title,
  viewUrl,
}: StudyMaterialViewerProps) {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(isPdf);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPdf) {
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    fetch(viewUrl, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "Failed to load PDF preview");
        }

        const blob = await response.blob();
        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) {
          setPdfError(
            error instanceof Error ? error.message : "Failed to load PDF preview"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPdfLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isPdf, viewUrl]);

  return (
    <div
      className="select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      {isPdf ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {pdfLoading ? (
            <p className="px-6 py-16 text-center text-sm text-slate-500">
              Loading PDF preview...
            </p>
          ) : pdfError ? (
            <p className="px-6 py-16 text-center text-sm text-red-600">
              {pdfError}
            </p>
          ) : pdfBlobUrl ? (
            <iframe
              key={materialId}
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
              title={title}
              className="h-[75vh] w-full bg-white"
            />
          ) : null}
        </div>
      ) : null}

      {isImage ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewUrl}
            alt={title}
            draggable={false}
            className="mx-auto max-h-[75vh] w-full object-contain"
          />
        </div>
      ) : null}

      {!isPdf && !isImage ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
          This file type cannot be previewed in the browser.
        </div>
      ) : null}
    </div>
  );
}
