"use client";

import { useEffect, useState } from "react";

function waitForWindowLoad() {
  return new Promise<void>((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForVideo() {
  return new Promise<void>((resolve) => {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video) {
      resolve();
      return;
    }

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve();
      return;
    }

    const finish = () => {
      video.removeEventListener("canplaythrough", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", finish);
      resolve();
    };

    video.addEventListener("canplaythrough", finish, { once: true });
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", finish, { once: true });

    // Don't block forever if the video stalls
    window.setTimeout(finish, 10000);
  });
}

function waitForImages() {
  return new Promise<void>((resolve) => {
    // Only block on eagerly loaded images (lazy ones may wait for scroll)
    const images = Array.from(document.images).filter(
      (img) => img.loading !== "lazy"
    );

    if (images.length === 0) {
      resolve();
      return;
    }

    let remaining = images.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };

    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        done();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

    // Safety net if an eager image stalls
    window.setTimeout(resolve, 10000);
  });
}

export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    (async () => {
      await Promise.all([
        document.fonts.ready,
        waitForWindowLoad(),
        waitForVideo(),
        waitForImages(),
      ]);

      // Let the first paint settle before dismissing
      await new Promise((r) => window.setTimeout(r, 200));

      if (cancelled) return;

      setFading(true);
      window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        document.body.style.overflow = previousOverflow;
      }, 500);
    })();

    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-white transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-busy={!fading}
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-col items-center gap-6 px-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight text-slate-950">
            CellsInVitro
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Loading experience
          </p>
        </div>
      </div>
    </div>
  );
}
