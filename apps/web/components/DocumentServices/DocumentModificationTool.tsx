"use client";

import { useState, ChangeEvent } from "react";
import { parseDocxFile, DocStats } from "@/lib/doc-parser";
import PaymentModal from "./PaymentModal";

export type ServiceType =
  | "grammar"
  | "proofreading"
  | "formatting"
  | "citation"
  | "plagiarism_check"
  | "plagiarism_removal"
  | "ai_report"
  | "ai_removal";

interface ServiceOption {
  id: ServiceType;
  name: string;
  category: "word" | "page" | "cite" | "coming_soon";
  rateText: string;
  baseRate: number; // in INR
  description: string;
  unitLabel: string;
  isAvailable: boolean;
}

const SERVICES: ServiceOption[] = [
  {
    id: "grammar",
    name: "Grammar & Syntax Correction",
    category: "word",
    rateText: "₹0.9 / word",
    baseRate: 0.9,
    description: "Fix grammatical errors, punctuation, vocabulary, sentence structure & style consistency.",
    unitLabel: "words",
    isAvailable: true,
  },
  {
    id: "proofreading",
    name: "Comprehensive Proofreading",
    category: "word",
    rateText: "₹0.5 / word",
    baseRate: 0.5,
    description: "Line-by-line review for spelling, typos, basic grammar, clarity & overall readability.",
    unitLabel: "words",
    isAvailable: true,
  },
  {
    id: "formatting",
    name: "Document & Layout Formatting",
    category: "page",
    rateText: "₹100 / page",
    baseRate: 100,
    description: "Standardize margins (1-inch), 1.5 line spacing, 12pt font, heading hierarchy & table layouts.",
    unitLabel: "pages",
    isAvailable: true,
  },
  {
    id: "citation",
    name: "Citation & Reference Formatting",
    category: "cite",
    rateText: "₹20 – ₹50 / citation",
    baseRate: 30, // Standard default rate ₹30 per cite
    description: "Format in-text citations & bibliography list to standard styles (APA, IEEE, Vancouver, Harvard).",
    unitLabel: "citations",
    isAvailable: true,
  },
  {
    id: "plagiarism_check",
    name: "Plagiarism Check",
    category: "coming_soon",
    rateText: "Coming Soon",
    baseRate: 0,
    description: "Detailed similarity index report with highlighted matching sources across academic databases.",
    unitLabel: "document",
    isAvailable: false,
  },
  {
    id: "plagiarism_removal",
    name: "Plagiarism Removal & Paraphrasing",
    category: "coming_soon",
    rateText: "Coming Soon",
    baseRate: 0,
    description: "Manual academic rephrasing to reduce similarity percentage while retaining core technical meaning.",
    unitLabel: "document",
    isAvailable: false,
  },
  {
    id: "ai_report",
    name: "AI Content Detection Report",
    category: "coming_soon",
    rateText: "Coming Soon",
    baseRate: 0,
    description: "Comprehensive AI score analysis report identifying machine-generated text sections.",
    unitLabel: "document",
    isAvailable: false,
  },
  {
    id: "ai_removal",
    name: "AI Content Removal & Humanizing",
    category: "coming_soon",
    rateText: "Coming Soon",
    baseRate: 0,
    description: "Humanizing AI-generated draft sections into authentic, high-impact scholarly prose.",
    unitLabel: "document",
    isAvailable: false,
  },
];

export default function DocumentModificationTool() {
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceType>("grammar");
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [refFileError, setRefFileError] = useState<string | null>(null);

  // Auto-detection & manual state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoDetectedStats, setAutoDetectedStats] = useState<DocStats | null>(null);
  const [manualCount, setManualCount] = useState<number>(500); // fallback quantity
  const [citationRate, setCitationRate] = useState<number>(30); // for citation rate slider ₹20-50

  // Payment modal toggle
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const selectedService: ServiceOption = SERVICES.find((s) => s.id === selectedServiceId) || SERVICES[0]!;

  // Handle Main Document File Change
  const handleMainFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".doc") && !fileName.endsWith(".docx")) {
      setFileError("Invalid file format. Mandatory upload accepts .doc or .docx files only.");
      setMainFile(null);
      return;
    }

    setMainFile(file);
    setIsAnalyzing(true);
    setAutoDetectedStats(null);

    // Trigger auto-parsing
    const stats = await parseDocxFile(file);
    setIsAnalyzing(false);
    setAutoDetectedStats(stats);

    if (stats.success) {
      if (selectedService.category === "word" && stats.wordCount > 0) {
        setManualCount(stats.wordCount);
      } else if (selectedService.category === "page" && stats.estimatedPages > 0) {
        setManualCount(stats.estimatedPages);
      } else if (selectedService.category === "cite" && stats.citationCount > 0) {
        setManualCount(stats.citationCount);
      }
    }
  };

  // Handle Reference File Change (max 10MB)
  const handleReferenceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setRefFileError(null);

    if (!file) return;

    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSizeBytes) {
      setRefFileError("Reference file exceeds the 10 MB maximum limit.");
      setReferenceFile(null);
      return;
    }

    setReferenceFile(file);
  };

  // Service change update handler
  const handleServiceChange = (serviceId: ServiceType) => {
    setSelectedServiceId(serviceId);
    const newService = SERVICES.find((s) => s.id === serviceId);
    if (newService && autoDetectedStats && autoDetectedStats.success) {
      if (newService.category === "word") {
        setManualCount(autoDetectedStats.wordCount || 500);
      } else if (newService.category === "page") {
        setManualCount(autoDetectedStats.estimatedPages || 2);
      } else if (newService.category === "cite") {
        setManualCount(autoDetectedStats.citationCount || 10);
      }
    } else if (newService) {
      if (newService.category === "word") setManualCount(1000);
      else if (newService.category === "page") setManualCount(5);
      else if (newService.category === "cite") setManualCount(15);
    }
  };

  // Calculate price dynamically
  const activeRate = selectedService.id === "citation" ? citationRate : selectedService.baseRate;
  const currentQuantity = Math.max(1, manualCount || 1);
  const rawTotalPrice = currentQuantity * activeRate;
  const totalPrice = Math.round(rawTotalPrice);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: Service Description, Rate Matrix & Confidentiality Assurance */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Instant Cost Calculation • Safe & Confidential
            </span>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Professional Document Editing & Modification
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Enhance the clarity, academic rigor, typography, and citation precision of your research manuscripts, theses, and technical reports. Submit your document with 100% confidence.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">1 - 3 Days</p>
                  <p className="text-[11px] text-slate-500">Standard Turnaround</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  🛡️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Non-Disclosure</p>
                  <p className="text-[11px] text-slate-500">Zero Work Misuse</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Rate Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Transparent Rate Card</span>
              <span className="text-xs font-normal text-slate-500">No Hidden Charges</span>
            </h3>

            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Grammar & Syntax</p>
                  <p className="text-xs text-slate-500">Punctuation, vocabulary, sentence polish</p>
                </div>
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                  ₹0.9 / word
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Proofreading</p>
                  <p className="text-xs text-slate-500">Typos, line review, readability fix</p>
                </div>
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                  ₹0.5 / word
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Document Formatting</p>
                  <p className="text-xs text-slate-500">1-inch margins, 1.5 spacing, 12pt fonts</p>
                </div>
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                  ₹100 / page
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Citation Formatting</p>
                  <p className="text-xs text-slate-500">APA, IEEE, Vancouver, Harvard styles</p>
                </div>
                <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                  ₹20 – ₹50 / cite
                </span>
              </div>
            </div>

            {/* Coming Soon Services */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Coming Soon Services
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.filter((s) => !s.isAvailable).map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 p-2.5 text-xs opacity-75"
                  >
                    <span className="font-medium text-slate-700">{service.name}</span>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confidentiality & Security Guarantee Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">100% Data Security & Anti-Misuse Guarantee</h3>
                <p className="text-xs text-slate-600">Your research & intellectual property remain strictly your own.</p>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>No Work Reuse:</strong> We guarantee your uploaded Word files will NEVER be published, copied, resold, or used as our work anywhere else.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Direct Mail Processing:</strong> Documents are transmitted directly into our secure editor inbox and auto-purged from servers after final completion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Non-Disclosure Agreement:</strong> Strict editor NDAs protect un-submitted manuscripts and experimental datasets.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Order & File Upload Form */}
        <div className="lg:col-span-6">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Order Service & Calculate Cost</h3>
                <p className="text-xs text-slate-500">Upload your file & get instant upfront pricing</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                Step 1 of 2
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {/* Service Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Modification Service *
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(e.target.value as ServiceType)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {SERVICES.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                      disabled={!service.isAvailable}
                    >
                      {service.name} ({service.rateText}) {!service.isAvailable ? "— Coming Soon" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {selectedService.description}
                </p>
              </div>

              {/* Citation Rate Selector (Only for Citation Service) */}
              {selectedService.id === "citation" && (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                    <span>Citation Intensity / Rate per Cite:</span>
                    <span className="text-emerald-700 font-bold">₹{citationRate} / cite</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="5"
                    value={citationRate}
                    onChange={(e) => setCitationRate(Number(e.target.value))}
                    className="w-full mt-2 accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>₹20 (Basic formatting)</span>
                    <span>₹35 (Standard APA/IEEE)</span>
                    <span>₹50 (Deep CrossRef verify)</span>
                  </div>
                </div>
              )}

              {/* Mandatory File Upload Zone (.doc / .docx) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Upload Word File * <span className="text-emerald-600 font-normal">(Mandatory • .doc or .docx)</span>
                  </label>
                  {mainFile && (
                    <button
                      onClick={() => {
                        setMainFile(null);
                        setAutoDetectedStats(null);
                      }}
                      className="text-[11px] font-medium text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-5 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/20">
                  <input
                    type="file"
                    accept=".doc,.docx"
                    onChange={handleMainFileChange}
                    className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer"
                  />
                  {!mainFile ? (
                    <div className="space-y-1.5">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/80 text-slate-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Click to upload or drag & drop your Word file
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Acceptable formats: <strong className="text-slate-700">.doc, .docx</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs">
                          DOC
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {mainFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(mainFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      {isAnalyzing ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Auto-detecting...</span>
                        </div>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                          Uploaded ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{fileError}</p>
                )}
              </div>

              {/* Auto-detected Stats Badge */}
              {autoDetectedStats && (
                <div
                  className={`rounded-xl p-3 text-xs border ${
                    autoDetectedStats.success
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-amber-50/80 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>{autoDetectedStats.success ? "✨ Auto-Detection Complete:" : "⚠️ Notice:"}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {autoDetectedStats.message}
                  </p>
                </div>
              )}

              {/* Quantity Entry (Auto-detected or Manual override) */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Number of {selectedService.unitLabel.toUpperCase()} *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {autoDetectedStats?.success ? "Auto-calculated (Editable)" : "Enter manually"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={manualCount || ""}
                    onChange={(e) => setManualCount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-600 shrink-0">
                    {selectedService.unitLabel}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] text-slate-500">
                  {selectedService.category === "word" && "Word count is measured across the full text."}
                  {selectedService.category === "page" && "Based on standard formatting (~250 words per page)."}
                  {selectedService.category === "cite" && "Count of reference citations in manuscript."}
                </p>
              </div>

              {/* Optional Reference File Upload Zone */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Upload Sample/Reference File <span className="text-slate-400 font-normal">(Optional • Max 10MB)</span>
                  </label>
                  {referenceFile && (
                    <button
                      onClick={() => setReferenceFile(null)}
                      className="text-[11px] font-medium text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="relative rounded-xl border border-slate-200 bg-white p-3 text-center hover:border-slate-300 transition-colors">
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,.jpg,.jpeg,.png"
                    onChange={handleReferenceFileChange}
                    className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer"
                  />
                  {!referenceFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>Attach target style guide or reference PDF/image (.doc, .pdf, .jpg)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
                      <span className="truncate max-w-[250px]">📎 {referenceFile.name}</span>
                      <span className="text-emerald-600 text-[11px] font-bold">Attached</span>
                    </div>
                  )}
                </div>
                {refFileError && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{refFileError}</p>
                )}
              </div>

              {/* Total Calculation Display Card */}
              <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Service Charge</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentQuantity.toLocaleString()} {selectedService.unitLabel} @ ₹{activeRate}/{selectedService.unitLabel.slice(0, -1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-emerald-400">
                      ₹{totalPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400">
                    Includes full editing review, track changes report, & direct email delivery.
                  </p>
                  <button
                    type="button"
                    disabled={!mainFile}
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {!mainFile ? "Upload Word File to Pay" : "Pay Now →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        serviceTitle={selectedService.name}
        quantity={currentQuantity}
        unitLabel={selectedService.unitLabel}
        unitPrice={activeRate}
        totalPrice={totalPrice}
        uploadedFileName={mainFile?.name || "Uploaded_Document.docx"}
        referenceFileName={referenceFile?.name}
      />
    </div>
  );
}
