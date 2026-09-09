"use client";

import { useEffect, useState } from "react";

type StudyMaterialViewerProps = {
  materialId: string;
  mimeType: string;
  title: string;
  viewUrl: string;
  hasAccess?: boolean;
};

export default function StudyMaterialViewer({
  materialId,
  mimeType,
  title,
  viewUrl,
  hasAccess = true,
}: StudyMaterialViewerProps) {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const isProtected = !hasAccess;

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(isPdf);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);

  useEffect(() => {
    if (!isProtected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // PrintScreen key
      if (key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        setShowScreenshotWarning(true);
        if (navigator.clipboard) {
          navigator.clipboard.writeText("Screenshots disabled").catch(() => {});
        }
        setTimeout(() => setShowScreenshotWarning(false), 3000);
        return false;
      }

      // Print shortcut (Ctrl+P / Cmd+P)
      if (isCmdOrCtrl && (key === "p" || key === "P")) {
        e.preventDefault();
        setShowScreenshotWarning(true);
        setTimeout(() => setShowScreenshotWarning(false), 3000);
        return false;
      }

      // Save shortcut (Ctrl+S / Cmd+S)
      if (isCmdOrCtrl && (key === "s" || key === "S")) {
        e.preventDefault();
        return false;
      }

      // DevTools (F12 or Ctrl+Shift+I / Cmd+Opt+I)
      if (
        key === "F12" ||
        (isCmdOrCtrl &&
          e.shiftKey &&
          (key === "I" || key === "i" || key === "C" || key === "c" || key === "J" || key === "j"))
      ) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        if (navigator.clipboard) {
          navigator.clipboard.writeText("").catch(() => {});
        }
        setShowScreenshotWarning(true);
        setTimeout(() => setShowScreenshotWarning(false), 3000);
      }
    };

    const handleBlur = () => {
      setIsFocusLost(true);
    };
    const handleFocus = () => {
      setIsFocusLost(false);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsFocusLost(true);
      } else {
        setIsFocusLost(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isProtected]);

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
      className={`relative ${isProtected ? "select-none" : ""}`}
      onContextMenu={(event) => isProtected && event.preventDefault()}
      onCopy={(event) => isProtected && event.preventDefault()}
      onCut={(event) => isProtected && event.preventDefault()}
      onDragStart={(event) => isProtected && event.preventDefault()}
    >
      {isProtected ? (
        <style>{`
          @media print {
            body, html {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}</style>
      ) : null}

      {/* Screenshot Warning Toast */}
      {isProtected && showScreenshotWarning ? (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xl animate-bounce">
          🚫 Screenshots and screen capturing are disabled for this material.
        </div>
      ) : null}

      {/* Content Container */}
      <div
        className={`relative transition-all duration-200 ${
          isProtected && isFocusLost ? "blur-2xl opacity-15 pointer-events-none select-none" : ""
        }`}
      >
        {/* Dynamic Watermark Overlay (Only for unpaid/preview mode) */}
        {isProtected ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-wrap items-center justify-around overflow-hidden opacity-[0.08] select-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="m-6 -rotate-45 text-xs font-bold tracking-widest text-slate-900 uppercase"
              >
                PREVIEW ONLY • CELLSINVITRO • PROTECTED
              </span>
            ))}
          </div>
        ) : null}

        {isPdf ? (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {pdfLoading ? (
              <p className="px-6 py-16 text-center text-sm text-slate-500">
                Loading PDF preview...
              </p>
            ) : pdfError ? (
              <p className="px-6 py-16 text-center text-sm text-red-600">
                {pdfError}
              </p>
            ) : pdfBlobUrl ? (
              <>
                <iframe
                  key={materialId}
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
                  title={title}
                  className="h-[75vh] w-full bg-white"
                  style={
                    isProtected
                      ? {
                          filter: "blur(3px) brightness(0.85)",
                          userSelect: "none",
                          pointerEvents: "none",
                          WebkitUserSelect: "none",
                        }
                      : undefined
                  }
                />
                {/* Interaction-blocking overlay for locked PDFs.
                    Sits above the iframe so clicks, scroll, and text-select
                    inside the iframe are completely blocked. */}
                {isProtected ? (
                  <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 select-none"
                    style={{ cursor: "not-allowed" }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {/* Frosted centre card */}
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/70 px-8 py-7 text-center shadow-2xl backdrop-blur-sm max-w-xs">
                      <div className="rounded-full bg-amber-400/15 p-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="h-8 w-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Preview Only</p>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          Purchase this resource to unlock the full document and enable downloads.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {isImage ? (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewUrl}
              alt={title}
              draggable={!isProtected}
              onContextMenu={(e) => isProtected && e.preventDefault()}
              className="mx-auto max-h-[75vh] w-full object-contain"
              style={
                isProtected
                  ? { filter: "blur(12px) brightness(0.6)", userSelect: "none", pointerEvents: "none" }
                  : undefined
              }
            />
            {/* Same lock overlay for locked images in the full viewer */}
            {isProtected ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 select-none"
                style={{ cursor: "not-allowed" }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/70 px-8 py-7 text-center shadow-2xl backdrop-blur-sm max-w-xs">
                  <div className="rounded-full bg-amber-400/15 p-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="h-8 w-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Preview Only</p>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      Purchase this resource to view and download the full image.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isPdf && !isImage ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
            This file type cannot be previewed in the browser.
          </div>
        ) : null}
      </div>

      {/* Focus Lost Overlay (when user opens Snipping tool or switches window during preview) */}
      {isProtected && isFocusLost ? (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-2xl bg-slate-950/80 p-6 text-center backdrop-blur-md">
          <div className="rounded-full bg-red-500/20 p-3 text-red-400 mb-3">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">Content Protected</h3>
          <p className="mt-1 text-xs text-slate-300 max-w-xs">
            Preview is blurred while window is out of focus to prevent screen capturing. Click back into the window to resume viewing.
          </p>
        </div>
      ) : null}
    </div>
  );
}
