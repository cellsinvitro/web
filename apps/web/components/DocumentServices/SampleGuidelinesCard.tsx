"use client";

import { downloadStandardTemplate } from "@/lib/template-generator";

export default function SampleGuidelinesCard() {
  return (
    <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-900 p-6 sm:p-10 text-white shadow-lg">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
        {/* Rules Overview */}
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            📋 Document Preparation Rules & Standards
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white">
            Default Page Settings & Submission Rules
          </h3>

          <p className="text-sm leading-relaxed text-slate-300">
            To ensure rapid turnaround and accurate word/page count calculations, please adhere to our default formatting standards or download our pre-styled Word template.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-200 pt-2">
            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-emerald-400 font-bold text-base">⏱️</span>
              <div>
                <p className="font-bold text-white">1 – 3 Business Days</p>
                <p className="text-[11px] text-slate-400">Guaranteed turnaround SLA</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-emerald-400 font-bold text-base">📐</span>
              <div>
                <p className="font-bold text-white">1-Inch Margins & 1.5 Line Spacing</p>
                <p className="text-[11px] text-slate-400">12pt Times New Roman / Calibri font</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 sm:col-span-2">
              <span className="text-amber-400 font-bold text-base">🖼️</span>
              <div>
                <p className="font-bold text-amber-300">Remove Embedded Images Prior to Upload</p>
                <p className="text-[11px] text-slate-300">
                  Please strip heavy images, scanned graphics, or embedded figures from your manuscript Word file to prevent formatting distortion. If figures need review, attach them in the optional reference file.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Template Download CTA */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-800 p-6 border border-slate-700 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xl">
            📄
          </div>
          <h4 className="text-base font-bold text-white">Need a Standard Template?</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Download our standard pre-styled Word template. It automatically forces 1.5 line spacing, 1-inch margins, and cleans up legacy font size hacks.
          </p>
          <button
            onClick={downloadStandardTemplate}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 px-4 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Clean Word Template (.doc)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
