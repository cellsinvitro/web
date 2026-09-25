"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force DOM muted properties (fixes React hydration autoplay bug)
    video.muted = true;
    video.defaultMuted = true;

    const attemptPlay = () => {
      video.play().catch((err) => {
        console.warn("Hero video autoplay delayed or blocked:", err);
      });
    };

    attemptPlay();

    // Listen for early user interaction to trigger playback if autoplay was blocked by browser
    const handleUserInteraction = () => {
      if (video.paused) {
        attemptPlay();
      }
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
    };

    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("scroll", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-white"
    >
      {/* Background Media Container */}
      <div className="absolute inset-0 bg-slate-900">
        {/* Poster Image / Fallback Background */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            isVideoLoaded ? "opacity-30" : "opacity-90"
          }`}
          style={{ backgroundImage: `url('/images/hero-poster.jpg')` }}
        />

        {/* Video Element with Autoplay Resilience */}
        {!hasError && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/hero-poster.jpg"
            onLoadedData={() => setIsVideoLoaded(true)}
            onPlaying={() => setIsVideoLoaded(true)}
            onError={() => {
              console.warn("Hero video failed to load, falling back to background poster.");
              setHasError(true);
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/videos/cell-division.mp4" type="video/mp4" />
          </video>
        )}

        {/* Soft readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10" />

        {/* Very subtle bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/40 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-16 pt-32 lg:px-8">
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />

            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Advancing Cellular Research
            </span>
          </div>

          {/* Main heading */}
          <h1 className="select-none text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Where cellular science meets innovation.
          </h1>

          {/* Description */}
          <p className="mt-7 max-w-xl select-none text-base leading-7 text-slate-600 sm:text-lg">
            Empowering researchers with reliable, research-focused solutions
            designed to accelerate discovery and advance the future of
            biotechnology.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/kits"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Explore Research Kits
              <span>→</span>
            </Link>

            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-sm transition-all hover:bg-white"
            >
              Discover More
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}