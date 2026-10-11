"use client";

import { useState } from "react";
import Image from "next/image";

export default function DocServicesPoster() {
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 pt-28 pb-16 text-white sm:pt-32 sm:pb-24 lg:pt-36 lg:pb-28">
      {/* Ambient background glows & grid texture */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-teal-500/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[140px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Eyebrow Chip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>CELLSINVITRO SCIENTIFIC EDITORIAL SUITE</span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> 100% Confidential NDA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> 24–72h Turnaround
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓</span> Zero Work Misuse
            </span>
          </div>
        </div>

        {/* Poster Grid: Content on Left, Poster Graphic Artwork on Right */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* LEFT COLUMN: Headings, Value Propositions & Quick Services Matrix */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                Publication-Grade Precision for Your{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                  Research Manuscripts
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300">
                Ensure your scientific manuscripts, theses, and reports meet peer-review expectations. Our specialized editors refine grammar, fix layout standardizations, and verify academic citations with strict confidentiality.
              </p>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => scrollToSection("services-section")}
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Calculate Cost & Order Service</span>
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("before-after")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <span>Compare Before & After</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("inquiry-sample")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-5 py-3.5 text-sm font-semibold text-emerald-300 backdrop-blur-sm transition-all hover:bg-emerald-900/60 hover:text-white"
              >
                <span>₹100 Sample Page Test</span>
              </button>
            </div>

            {/* Quick Service Rate Matrix Cards */}
            <div className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Core Services & Transparent Rates
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div
                  onClick={() => scrollToSection("services-section")}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur-md transition-all hover:border-emerald-500/50 hover:bg-slate-850 hover:-translate-y-0.5"
                >
                  <span className="text-lg">✍️</span>
                  <p className="mt-1.5 text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Grammar Polish
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">₹0.9 <span className="text-[11px] font-normal text-slate-400">/ word</span></p>
                </div>

                <div
                  onClick={() => scrollToSection("services-section")}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur-md transition-all hover:border-emerald-500/50 hover:bg-slate-850 hover:-translate-y-0.5"
                >
                  <span className="text-lg">🔍</span>
                  <p className="mt-1.5 text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Proofreading
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">₹0.5 <span className="text-[11px] font-normal text-slate-400">/ word</span></p>
                </div>

                <div
                  onClick={() => scrollToSection("services-section")}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur-md transition-all hover:border-emerald-500/50 hover:bg-slate-850 hover:-translate-y-0.5"
                >
                  <span className="text-lg">📐</span>
                  <p className="mt-1.5 text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Page Layout
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">₹100 <span className="text-[11px] font-normal text-slate-400">/ page</span></p>
                </div>

                <div
                  onClick={() => scrollToSection("services-section")}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur-md transition-all hover:border-emerald-500/50 hover:bg-slate-850 hover:-translate-y-0.5"
                >
                  <span className="text-lg">📚</span>
                  <p className="mt-1.5 text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Citation Sync
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">₹20–50 <span className="text-[11px] font-normal text-slate-400">/ cite</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Visual Poster Card & Preview Showcase */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative gradient border */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 opacity-30 blur-lg transition-all group-hover:opacity-50" />

              {/* Main Poster Container */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl">
                {/* Poster Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/70">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-[11px] font-medium tracking-wide text-slate-400">
                      Editorial Poster • CellsInVitro
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPosterModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>View Large</span>
                  </button>
                </div>

                {/* Poster Image Frame */}
                <div
                  className="relative aspect-[16/10] sm:aspect-[16/9] w-full cursor-pointer overflow-hidden bg-slate-950 group"
                  onClick={() => setIsPosterModalOpen(true)}
                >
                  <Image
                    src="/images/doc-services-poster.jpg"
                    alt="CellsInVitro Document Editing Services Poster"
                    fill
                    priority
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle glass reflection & click hint overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 backdrop-blur-[2px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Click to Enlarge Poster
                    </span>
                  </div>

                  {/* Floating Certified Seal Badge */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                        ✓
                      </span>
                      <span className="font-semibold text-slate-200">
                        Peer-Reviewed Standard Formatting
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-400">
                      Zero Misuse SLA
                    </span>
                  </div>
                </div>

                {/* Poster Caption / Highlights footer */}
                <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-300">
                      Accepting <strong className="text-white">.doc</strong> & <strong className="text-white">.docx</strong> manuscripts
                    </p>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      Instant Word Count Detection
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SCROLL INDICATOR: Direct visual affordance to scroll down to services */}
        <div className="mt-14 flex flex-col items-center justify-center pt-8 border-t border-slate-800/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2.5">
            Explore All Services & Instant Calculator Below
          </p>
          <button
            type="button"
            onClick={() => scrollToSection("services-section")}
            className="group flex flex-col items-center gap-1.5 text-xs text-slate-300 transition-colors hover:text-emerald-400 cursor-pointer"
            aria-label="Scroll to services"
          >
            <span className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1.5 font-medium shadow-sm group-hover:border-emerald-500/50 group-hover:bg-slate-800">
              Scroll down to upload & calculate
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-emerald-400 animate-bounce group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* MODAL: Fullscreen Poster Preview */}
      {isPosterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsPosterModalOpen(false)}
        >
          <div
            className="relative max-h-[92vh] max-w-5xl w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <h3 className="text-sm font-bold text-white">
                CellsInVitro • Document Modification Poster
              </h3>
              <button
                type="button"
                onClick={() => setIsPosterModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative aspect-[16/9] w-full bg-slate-950">
              <Image
                src="/images/doc-services-poster.jpg"
                alt="CellsInVitro Full Document Modification Poster"
                fill
                className="object-contain"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-xs text-slate-400">
              <span>Publication-Grade Scientific Editorial Services</span>
              <button
                type="button"
                onClick={() => {
                  setIsPosterModalOpen(false);
                  scrollToSection("services-section");
                }}
                className="rounded-lg bg-emerald-500 px-3.5 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
              >
                Proceed to Service Calculator →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
