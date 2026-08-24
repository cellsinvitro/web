"use client";

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

  return (
    <div
      className="select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      {isPdf ? (
        <iframe
          key={materialId}
          src={`${viewUrl}#toolbar=0&navpanes=0`}
          title={title}
          className="h-[75vh] w-full rounded-2xl border border-slate-200 bg-slate-50"
          sandbox="allow-scripts allow-same-origin"
        />
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
