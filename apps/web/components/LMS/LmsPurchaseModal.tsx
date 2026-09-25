"use client";

import React, { useState, useEffect } from "react";
import {
  fetchLmsSettings,
  createLmsOrder,
  verifyLmsPayment,
  type LmsSettings,
} from "@/lib/api";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type SectionDef = {
  key: "lms_repo" | "lms_stock" | "lms_budget" | "lms_logbook";
  title: string;
  icon: string;
  badge: string;
  description: string;
  features: string[];
};

const LMS_SECTIONS: SectionDef[] = [
  {
    key: "lms_repo",
    title: "Repository & Cryo Storage",
    icon: "❄️",
    badge: "Cell Banking",
    description: "2D visual rack & box layout, cryovial inventory, dewar tracking & solution calculators.",
    features: ["Interactive 2D Grid Storage", "Cell line color code mapping", "Cryovial barcodes & location"],
  },
  {
    key: "lms_stock",
    title: "Stock Inventory",
    icon: "📦",
    badge: "Lab Supplies",
    description: "Track chemicals, reagents, consumables, low stock threshold alerts & stock transactions.",
    features: ["Reagent & chemical tracking", "Automatic stock deficit alerts", "Lab inventory logs & issue"],
  },
  {
    key: "lms_budget",
    title: "Budget Management",
    icon: "💰",
    badge: "Finance",
    description: "Manage lab budget heads, expense submissions, grant allocations & financial tracking.",
    features: ["Custom budget heads", "Expense submission forms", "Real-time budget utilization"],
  },
  {
    key: "lms_logbook",
    title: "Lab Logbook & Protocols",
    icon: "📓",
    badge: "ELN Notebook",
    description: "Electronic lab notebook, experimental protocols, workspace team member permissions.",
    features: ["Collaborative lab notebook", "Protocol & experiment logs", "Member roles & permissions"],
  },
];

interface LmsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSection?: string;
  onSuccess: (unlockedSections: string[]) => void;
}

export default function LmsPurchaseModal({
  isOpen,
  onClose,
  targetSection,
  onSuccess,
}: LmsPurchaseModalProps) {
  const [settings, setSettings] = useState<LmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isFullPass, setIsFullPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingSettings(true);
      fetchLmsSettings()
        .then((res) => {
          setSettings(res.settings);
          if (targetSection && LMS_SECTIONS.some((s) => s.key === targetSection)) {
            setSelectedSections([targetSection]);
          } else {
            setSelectedSections(["lms_repo", "lms_stock", "lms_budget", "lms_logbook"]);
            setIsFullPass(true);
          }
        })
        .catch((err) => setErrorMessage(err.message || "Failed to load pricing info"))
        .finally(() => setLoadingSettings(false));
    }
  }, [isOpen, targetSection]);

  if (!isOpen) return null;

  const toggleSection = (key: string) => {
    setIsFullPass(false);
    setSelectedSections((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        const next = [...prev, key];
        if (next.length === 4) setIsFullPass(true);
        return next;
      }
    });
  };

  const toggleFullPass = () => {
    if (isFullPass) {
      setIsFullPass(false);
      setSelectedSections(targetSection ? [targetSection] : ["lms_repo"]);
    } else {
      setIsFullPass(true);
      setSelectedSections(["lms_repo", "lms_stock", "lms_budget", "lms_logbook"]);
    }
  };

  // Pricing Calculation
  const calculatePricing = () => {
    if (!settings) return { original: 0, final: 0, discountPct: 0 };

    if (isFullPass || selectedSections.length >= 4) {
      const original =
        settings.repoPrice +
        settings.stockPrice +
        settings.budgetPrice +
        settings.logbookPrice;
      const final = settings.fullAccessPrice;
      const discountPct = Math.round((1 - final / original) * 100);
      return { original, final, discountPct };
    }

    const priceMap: Record<string, number> = {
      lms_repo: settings.repoPrice,
      lms_stock: settings.stockPrice,
      lms_budget: settings.budgetPrice,
      lms_logbook: settings.logbookPrice,
    };

    let original = 0;
    selectedSections.forEach((k) => {
      original += priceMap[k] || 0;
    });

    let discountPct = 0;
    if (selectedSections.length === 2) discountPct = settings.twoSectionDiscountPct;
    if (selectedSections.length === 3) discountPct = settings.threeSectionDiscountPct;

    const final = Math.round(original * (1 - discountPct / 100));
    return { original, final, discountPct };
  };

  const { original, final, discountPct } = calculatePricing();

  const handleCheckout = async () => {
    if (selectedSections.length === 0) {
      setErrorMessage("Please select at least one section to purchase.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const orderRes = await createLmsOrder({
        sections: isFullPass ? ["lms_full"] : selectedSections,
      });

      // Dev mode fallback
      if (orderRes.isDevMode && orderRes.completed) {
        onSuccess(isFullPass ? ["lms_repo", "lms_stock", "lms_budget", "lms_logbook", "lms_full"] : selectedSections);
        onClose();
        return;
      }

      if (!orderRes.orderId || !orderRes.keyId) {
        throw new Error("Unable to initiate Razorpay checkout.");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        throw new Error("Razorpay SDK failed to load. Check your network connection.");
      }

      const checkoutOptions = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "CellsInVitro LMS",
        description: orderRes.itemTitle || "LMS Section Access",
        order_id: orderRes.orderId,
        theme: { color: "#2563eb" },
        prefill: {
          name: orderRes.customerName || "",
          email: orderRes.customerEmail || "",
          contact: orderRes.customerPhone || "",
        },
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          qr: true,
        },
        config: {
          display: {
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await verifyLmsPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess(verifyRes.unlockedSections);
            onClose();
          } catch (err: any) {
            setErrorMessage(err.message || "Payment verification failed.");
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(checkoutOptions);
      razorpayInstance.open();
    } catch (err: any) {
      setErrorMessage(err.message || "Checkout failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800/60 rounded-full w-8 h-8 flex items-center justify-center transition"
          >
            ✕
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              LMS Suite Access
            </span>
            {discountPct > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 animate-pulse">
                Save {discountPct}% Off
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Unlock CellsInVitro LMS
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Choose individual modules, create dynamic multi-section bundles with bundle discounts, or upgrade to the Full LMS Pass.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto max-h-[70vh]">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="font-bold ml-2">✕</button>
            </div>
          )}

          {loadingSettings ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Loading LMS Pricing & Discount Options...</span>
            </div>
          ) : (
            <>
              {/* Full Pass Banner */}
              <div
                onClick={toggleFullPass}
                className={`mb-6 cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 ${
                  isFullPass
                    ? "border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                    : "border-slate-200 bg-slate-50/70 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isFullPass}
                      onChange={toggleFullPass}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-lg">Full LMS Pass (All 4 Sections)</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Best Value
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Includes Cryo Storage Repo, Stock Inventory, Budget Management & Lab Logbook.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-blue-700">
                      ₹{((settings?.fullAccessPrice || 399900) / 100).toLocaleString("en-IN")}
                    </div>
                    {settings && (
                      <div className="text-xs text-slate-400 line-through">
                        ₹{(
                          (settings.repoPrice +
                            settings.stockPrice +
                            settings.budgetPrice +
                            settings.logbookPrice) /
                          100
                        ).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Or Select Custom Sections & Bundle Discounts:
              </div>

              {/* Individual Section Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LMS_SECTIONS.map((section) => {
                  const isSelected = selectedSections.includes(section.key);
                  const price =
                    settings
                      ? settings[
                          `${section.key.replace("lms_", "")}Price` as keyof LmsSettings
                        ] || 149900
                      : 149900;

                  return (
                    <div
                      key={section.key}
                      onClick={() => toggleSection(section.key)}
                      className={`cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/40 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-2xl">{section.icon}</span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-base">{section.title}</h4>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {section.badge}
                              </span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSection(section.key)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-1"
                          />
                        </div>
                        <p className="text-xs text-slate-600 mb-3">{section.description}</p>
                        <ul className="text-[11px] text-slate-500 space-y-1 mb-4">
                          {section.features.map((feat, i) => (
                            <li key={i} className="flex items-center space-x-1.5">
                              <span className="text-blue-500">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Standalone Price</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{(Number(price) / 100).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left w-full sm:w-auto">
            <div className="text-xs text-slate-500">
              Selected: <span className="font-semibold text-slate-800">{selectedSections.length} Section(s)</span>
              {discountPct > 0 && (
                <span className="ml-2 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                  {discountPct}% Bundle Discount Applied
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                ₹{(final / 100).toLocaleString("en-IN")}
              </span>
              {discountPct > 0 && (
                <span className="text-sm text-slate-400 line-through">
                  ₹{(original / 100).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || selectedSections.length === 0}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Proceed to Pay &rarr;</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
