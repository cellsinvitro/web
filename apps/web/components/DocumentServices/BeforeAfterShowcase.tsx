"use client";

import { useState } from "react";

export default function BeforeAfterShowcase() {
  const [activeTab, setActiveTab] = useState<"grammar" | "formatting" | "citation">("grammar");

  return (
    <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Quality Verification
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Sample Work & Editing Standards
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Compare original unpolished user drafts with our professionally edited output before submitting your manuscript.
        </p>

        {/* Tab Switcher */}
        <div className="mt-6 inline-flex rounded-xl bg-slate-100 p-1.5 border border-slate-200">
          <button
            onClick={() => setActiveTab("grammar")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "grammar"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Grammar & Syntax
          </button>
          <button
            onClick={() => setActiveTab("formatting")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "formatting"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Page & Layout Formatting
          </button>
          <button
            onClick={() => setActiveTab("citation")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "citation"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Citation & References
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BEFORE BOX */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-6">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <span className="flex items-center gap-2 text-xs font-bold text-rose-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-200 text-rose-800 text-[10px]">✕</span>
              Original Unedited Draft (Before)
            </span>
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">User Input</span>
          </div>

          <div className="mt-4 text-xs leading-relaxed text-slate-700 font-mono space-y-3 bg-white/80 p-4 rounded-xl border border-rose-100/60 shadow-inner">
            {activeTab === "grammar" && (
              <>
                <p>
                  Cell culture assays <span className="bg-rose-200 text-rose-900 px-1 rounded">was</span> performed to evaluate the cytotoxic effect of compound X. We observed that the cells <span className="bg-rose-200 text-rose-900 px-1 rounded">dies quickly when conc</span> is high, which <span className="bg-rose-200 text-rose-900 px-1 rounded">show</span> that toxicity is dependent on dose.
                </p>
                <p>
                  However, the data <span className="bg-rose-200 text-rose-900 px-1 rounded">was not agreeing</span> with previous study by Smith, <span className="bg-rose-200 text-rose-900 px-1 rounded">whom said</span> no effect happens at 10 uM.
                </p>
              </>
            )}

            {activeTab === "formatting" && (
              <>
                <p className="text-[9pt] font-sans leading-tight">
                  1. INTRODUCTION (Unformatted 6pt font, 0.4-inch uneven margins, 1.0 spacing)<br/>
                  The growth rates of HeLa cell lines were measured over 48h. Margin settings were inconsistent across sections. Paragraph line spacing was cramped to force 1,000 words into a single page.
                </p>
                <p className="text-[9pt] italic text-rose-800">
                  ⚠️ Heavy embedded images causing pagination overflow errors.
                </p>
              </>
            )}

            {activeTab === "citation" && (
              <>
                <p>
                  According to previous reports <span className="bg-rose-200 text-rose-900 px-1 rounded">(Kumar et. al 2019, page 45)</span>, apoptosis is triggered. Other research also proved this <span className="bg-rose-200 text-rose-900 px-1 rounded">[Ref 4, 7]</span>.
                </p>
                <p className="text-[11px] text-slate-500 mt-2 italic">
                  References section:<br/>
                  Kumar et al. (2019). Cell death journal, pp 45-50. [Missing DOI & volume]
                </p>
              </>
            )}
          </div>
        </div>

        {/* AFTER BOX */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 text-[10px]">✓</span>
              Professionally Modified Output (After)
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Edited Result</span>
          </div>

          <div className="mt-4 text-xs leading-relaxed text-slate-800 font-sans space-y-3 bg-white/90 p-4 rounded-xl border border-emerald-100/80 shadow-sm">
            {activeTab === "grammar" && (
              <>
                <p>
                  Cell culture assays <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">were</span> performed to evaluate the cytotoxic effects of compound X. We observed that cellular viability <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">decreased rapidly at elevated concentrations</span>, demonstrating a dose-dependent toxicity profile.
                </p>
                <p>
                  However, these findings <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">contrast with the previous study by Smith et al., who reported</span> no observable effect at 10 µM.
                </p>
              </>
            )}

            {activeTab === "formatting" && (
              <>
                <div className="border-l-2 border-emerald-500 pl-3">
                  <p className="font-bold text-slate-900 text-sm">1. INTRODUCTION</p>
                  <p className="text-xs leading-normal mt-1 text-slate-700">
                    Standardized layout applied: 1.0-inch (2.54 cm) uniform margins, 1.5 line spacing, 12pt Times New Roman font, clean paragraph indents, and compliant section headings.
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    ✓ High-res images detached to prevent document corruption & lower file weight.
                  </p>
                </div>
              </>
            )}

            {activeTab === "citation" && (
              <>
                <p>
                  According to previous reports <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">(Kumar et al., 2019)</span>, apoptosis is triggered. Other research also confirmed these mechanisms <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-semibold">[4,7]</span>.
                </p>
                <p className="text-[11px] text-slate-600 mt-2 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                  <strong>APA 7th Reference Entry:</strong><br/>
                  Kumar, R., Sharma, A., & Patel, V. (2019). Mechanisms of programmed cell death in vitro. <em>Journal of Cellular Biochemistry</em>, 42(3), 45–50. https://doi.org/10.1016/j.jcb.2019.04.012
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
