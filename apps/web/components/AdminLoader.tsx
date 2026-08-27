"use client";

/**
 * AdminLoader — full-screen loader used while authenticating into admin,
 * and as an inline section loader within admin pages.
 *
 * Usage (full-screen):  <AdminLoader fullScreen />
 * Usage (inline):       <AdminLoader />
 */

function SpinRing({
  size,
  strokeWidth,
  duration,
  reverse,
  dashArray,
  colorA,
  colorB,
  id,
}: {
  size: number;
  strokeWidth: number;
  duration: string;
  reverse?: boolean;
  dashArray: string;
  colorA: string;
  colorB: string;
  id: string;
}) {
  const r = size / 2 - strokeWidth;
  const gradId = `grad-${id}`;
  return (
    <svg
      className="absolute inset-0 animate-spin"
      style={{
        animationDuration: duration,
        animationDirection: reverse ? "reverse" : "normal",
        width: size,
        height: size,
      }}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#f1f5f9"
        strokeWidth={strokeWidth - 0.5}
      />
      {/* Arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#${gradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
      />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop stopColor={colorA} />
          <stop offset="1" stopColor={colorB} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AdminSpinner({ size = 56 }: { size?: number }) {
  const outerR = size / 2 - 3;
  const innerSize = Math.round(size * 0.65);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <SpinRing
        id="outer"
        size={size}
        strokeWidth={2.5}
        duration="2.2s"
        dashArray={`${Math.round(outerR * 0.85)} 999`}
        colorA="#0f172a"
        colorB="#0f172a"
      />

      {/* Inner ring, positioned absolutely centred */}
      <div
        className="absolute"
        style={{
          width: innerSize,
          height: innerSize,
          top: (size - innerSize) / 2,
          left: (size - innerSize) / 2,
        }}
      >
        <SpinRing
          id="inner"
          size={innerSize}
          strokeWidth={2}
          duration="1.5s"
          reverse
          dashArray={`${Math.round((innerSize / 2 - 2.5) * 0.7)} 999`}
          colorA="#64748b"
          colorB="#64748b"
        />
      </div>

      {/* Nucleus */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute -inset-1.5 animate-ping rounded-full bg-slate-200 opacity-50" />
          <span className="relative block h-3 w-3 rounded-full bg-slate-900" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLoader({
  fullScreen = false,
  label = "Loading…",
}: {
  fullScreen?: boolean;
  label?: string;
}) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50">
        {/* Grid watermark */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glowing orb behind spinner */}
        <div className="absolute h-64 w-64 rounded-full bg-slate-200 opacity-40 blur-3xl" />

        <div className="relative flex flex-col items-center gap-7">
          <AdminSpinner size={64} />

          <div className="text-center">
            <p className="text-sm font-semibold tracking-tight text-slate-900">
              CellsInVitro
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
              Admin Panel
            </p>
          </div>

          {/* Staggered loading dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="block h-1 w-1 rounded-full bg-slate-400 opacity-0"
                style={{
                  animation: `adminDot 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes adminDot {
            0%, 80%, 100% { opacity: 0; transform: scale(0.7); }
            40%            { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // Inline variant (used inside page content areas)
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <AdminSpinner size={48} />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
