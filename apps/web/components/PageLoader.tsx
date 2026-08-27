"use client";

import { useEffect, useState, useRef } from "react";

function waitForWindowLoad() {
  return new Promise<void>((resolve) => {
    if (document.readyState === "complete") { resolve(); return; }
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForImages() {
  return new Promise<void>((resolve) => {
    const images = Array.from(document.images).filter((img) => img.loading !== "lazy");
    if (images.length === 0) { resolve(); return; }
    let remaining = images.length;
    const done = () => { if (--remaining <= 0) resolve(); };
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) { done(); return; }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    window.setTimeout(resolve, 8000);
  });
}

function waitForVideo() {
  return new Promise<void>((resolve) => {
    const video = document.querySelector<HTMLVideoElement>("video");
    if (!video || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) { resolve(); return; }
    const finish = () => resolve();
    video.addEventListener("canplaythrough", finish, { once: true });
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, 10000);
  });
}

/** Animated cell / microscope ring loader */
function CellLoader({ size = 72 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer orbit ring */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: "2.4s" }}
        viewBox="0 0 72 72"
        fill="none"
      >
        <circle cx="36" cy="36" r="33" stroke="#e2e8f0" strokeWidth="2" />
        <circle
          cx="36" cy="36" r="33"
          stroke="url(#grad1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="52 155"
          strokeDashoffset="0"
        />
        <defs>
          <linearGradient id="grad1" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Inner ring, counter-spin */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: "1.6s", animationDirection: "reverse", inset: "12px" }}
        viewBox="0 0 48 48"
        fill="none"
      >
        <circle cx="24" cy="24" r="21" stroke="#f1f5f9" strokeWidth="1.5" />
        <circle
          cx="24" cy="24" r="21"
          stroke="url(#grad2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="30 102"
        />
        <defs>
          <linearGradient id="grad2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#475569" />
            <stop offset="1" stopColor="#475569" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center nucleus pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-slate-200 opacity-60" />
          <span className="relative block h-4 w-4 rounded-full bg-slate-900" />
        </div>
      </div>
    </div>
  );
}

/** Top progress bar (NProgress-style) */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[110] h-[2.5px] overflow-hidden">
      <div
        className="h-full bg-slate-900 transition-all"
        style={{
          width: `${progress}%`,
          transitionDuration: progress < 90 ? "600ms" : "200ms",
          transitionTimingFunction: "ease-out",
          boxShadow: "0 0 8px 1px rgba(15,23,42,0.4)",
        }}
      />
    </div>
  );
}

export default function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Fake progress ticks
    const tick = () => {
      if (cancelled) return;
      // Asymptotically approach 90
      const increment = Math.random() * (90 - progressRef.current) * 0.15;
      progressRef.current = Math.min(90, progressRef.current + increment);
      setProgress(progressRef.current);
    };
    const interval = setInterval(tick, 350);

    (async () => {
      await Promise.all([
        document.fonts.ready,
        waitForWindowLoad(),
        waitForVideo(),
        waitForImages(),
      ]);
      await new Promise((r) => window.setTimeout(r, 180));
      if (cancelled) return;

      clearInterval(interval);
      progressRef.current = 100;
      setProgress(100);

      // Let the bar reach 100% visually before fading
      await new Promise((r) => window.setTimeout(r, 320));
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
      clearInterval(interval);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <ProgressBar progress={progress} />
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
          fading ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-busy={!fading}
        aria-live="polite"
        role="status"
      >
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col items-center gap-8">
          <CellLoader size={72} />

          <div className="text-center">
            <p className="text-[15px] font-semibold tracking-tight text-slate-950">
              CellsInVitro
            </p>
            <p
              className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400"
              style={{ letterSpacing: "0.28em" }}
            >
              Loading experience
            </p>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full bg-slate-300 animate-pulse"
                style={{ animationDelay: `${i * 200}ms`, animationDuration: "1s" }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
