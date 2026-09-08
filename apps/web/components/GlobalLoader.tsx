"use client";

import { useEffect, useState, useRef } from "react";

function waitForWindowLoad() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || document.readyState === "complete") {
      resolve();
      return;
    }
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForImages() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    const images = Array.from(document.images).filter((img) => img.loading !== "lazy");
    if (images.length === 0) {
      resolve();
      return;
    }
    let remaining = images.length;
    const done = () => {
      if (--remaining <= 0) resolve();
    };
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        done();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    window.setTimeout(resolve, 3000);
  });
}

/** Single unified brand animated cell / microscope orbit spinner */
export function CellSpinner({ size = 64 }: { size?: number }) {
  const outerR = (size / 2) * 0.88;
  const innerR = (size / 2) * 0.56;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer orbit ring */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: "2.4s" }}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle cx={size / 2} cy={size / 2} r={outerR} stroke="#e2e8f0" strokeWidth="2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerR}
          stroke="url(#globalGrad1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${outerR * 1.5} ${outerR * 4.5}`}
        />
        <defs>
          <linearGradient id="globalGrad1" x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Inner ring, counter-spin */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{
          animationDuration: "1.6s",
          animationDirection: "reverse",
          padding: `${size * 0.16}px`,
        }}
        viewBox={`0 0 ${size * 0.68} ${size * 0.68}`}
        fill="none"
      >
        <circle cx={(size * 0.68) / 2} cy={(size * 0.68) / 2} r={innerR} stroke="#f1f5f9" strokeWidth="1.5" />
        <circle
          cx={(size * 0.68) / 2}
          cy={(size * 0.68) / 2}
          r={innerR}
          stroke="url(#globalGrad2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${innerR * 1.4} ${innerR * 4.6}`}
        />
        <defs>
          <linearGradient id="globalGrad2" x1="0" y1="0" x2={size * 0.68} y2={size * 0.68} gradientUnits="userSpaceOnUse">
            <stop stopColor="#475569" />
            <stop offset="1" stopColor="#475569" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center nucleus pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute inset-0 -m-1.5 animate-ping rounded-full bg-slate-300 opacity-60" />
          <span className="relative block h-3.5 w-3.5 rounded-full bg-slate-950" />
        </div>
      </div>
    </div>
  );
}

/** Top progress bar (NProgress style) */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[110] h-[2.5px] overflow-hidden">
      <div
        className="h-full bg-slate-900 transition-all"
        style={{
          width: `${progress}%`,
          transitionDuration: progress < 90 ? "400ms" : "150ms",
          transitionTimingFunction: "ease-out",
          boxShadow: "0 0 8px 1px rgba(15,23,42,0.4)",
        }}
      />
    </div>
  );
}

export type GlobalLoaderProps = {
  fullScreen?: boolean;
  label?: string;
  sublabel?: string;
  showProgressBar?: boolean;
};

export default function GlobalLoader({
  fullScreen = true,
  label = "CellsInVitro",
  sublabel = "Loading experience",
  showProgressBar = true,
}: GlobalLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!fullScreen) return;

    let cancelled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const tick = () => {
      if (cancelled) return;
      const increment = Math.random() * (90 - progressRef.current) * 0.2;
      progressRef.current = Math.min(90, progressRef.current + increment);
      setProgress(progressRef.current);
    };
    const interval = setInterval(tick, 250);

    (async () => {
      await Promise.all([
        typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve(),
        waitForWindowLoad(),
        waitForImages(),
      ]);
      await new Promise((r) => window.setTimeout(r, 100));
      if (cancelled) return;

      clearInterval(interval);
      progressRef.current = 100;
      setProgress(100);

      await new Promise((r) => window.setTimeout(r, 200));
      if (cancelled) return;

      setFading(true);
      window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        document.body.style.overflow = previousOverflow;
      }, 400);
    })();

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullScreen]);

  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CellSpinner size={52} />
        {label && (
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            {sublabel && (
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {sublabel}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!visible) return null;

  return (
    <>
      {showProgressBar && <ProgressBar progress={progress} />}
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-400 ${
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
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col items-center gap-7">
          <CellSpinner size={72} />

          <div className="text-center">
            <p className="text-[16px] font-bold tracking-tight text-slate-950">
              {label}
            </p>
            {sublabel && (
              <p
                className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400"
                style={{ letterSpacing: "0.28em" }}
              >
                {sublabel}
              </p>
            )}
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse"
                style={{ animationDelay: `${i * 200}ms`, animationDuration: "1s" }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
