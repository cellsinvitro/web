"use client";

import React, { useState, useEffect } from "react";
import { fetchLmsSettings, updateLmsSettings, type LmsSettings } from "@/lib/api";

interface AdminPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminPricingModal({ isOpen, onClose, onSuccess }: AdminPricingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form values in Rupees (converted to/from paise for API)
  const [repoPriceRs, setRepoPriceRs] = useState(1499);
  const [stockPriceRs, setStockPriceRs] = useState(1499);
  const [budgetPriceRs, setBudgetPriceRs] = useState(1499);
  const [logbookPriceRs, setLogbookPriceRs] = useState(1999);
  const [fullAccessPriceRs, setFullAccessPriceRs] = useState(3999);
  const [twoSectionDiscountPct, setTwoSectionDiscountPct] = useState(15);
  const [threeSectionDiscountPct, setThreeSectionDiscountPct] = useState(25);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    fetchLmsSettings()
      .then(({ settings }) => {
        setRepoPriceRs(Math.round(settings.repoPrice / 100));
        setStockPriceRs(Math.round(settings.stockPrice / 100));
        setBudgetPriceRs(Math.round(settings.budgetPrice / 100));
        setLogbookPriceRs(Math.round(settings.logbookPrice / 100));
        setFullAccessPriceRs(Math.round(settings.fullAccessPrice / 100));
        setTwoSectionDiscountPct(settings.twoSectionDiscountPct);
        setThreeSectionDiscountPct(settings.threeSectionDiscountPct);
        setCurrency(settings.currency || "INR");
      })
      .catch((err) => {
        console.error("Failed to load LMS pricing settings", err);
        setError("Failed to load current prices.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: Partial<LmsSettings> = {
        repoPrice: Math.round(repoPriceRs * 100),
        stockPrice: Math.round(stockPriceRs * 100),
        budgetPrice: Math.round(budgetPriceRs * 100),
        logbookPrice: Math.round(logbookPriceRs * 100),
        fullAccessPrice: Math.round(fullAccessPriceRs * 100),
        twoSectionDiscountPct: Number(twoSectionDiscountPct),
        threeSectionDiscountPct: Number(threeSectionDiscountPct),
        currency: currency.trim().toUpperCase() || "INR",
      };

      const res = await updateLmsSettings(payload);
      if (res.success) {
        setSuccessMsg("LMS CryoSearch prices updated successfully!");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update pricing settings");
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-6h6M2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Configure CryoSearch Module Pricing
              </h2>
              <p className="text-xs text-slate-500">
                Update module subscription prices and bundle discount rates across the platform.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-2"></div>
            <p>Loading current LMS prices...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {successMsg}
              </div>
            )}

            {/* Individual Module Prices */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                1. Individual Module Prices ({currencySymbol})
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ❄️ Repository & Cryo Storage
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={repoPriceRs}
                      onChange={(e) => setRepoPriceRs(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📦 Stock Inventory
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={stockPriceRs}
                      onChange={(e) => setStockPriceRs(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    💰 Budget Management
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={budgetPriceRs}
                      onChange={(e) => setBudgetPriceRs(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    📓 Lab Logbook & Protocols
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={logbookPriceRs}
                      onChange={(e) => setLogbookPriceRs(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bundle & Discount Pricing */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                2. Bundles & Volume Discounts
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    🚀 Full Pass Price ({currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-amber-500">{currencySymbol}</span>
                    <input
                      type="number"
                      min={0}
                      value={fullAccessPriceRs}
                      onChange={(e) => setFullAccessPriceRs(Number(e.target.value))}
                      className="w-full rounded-xl border border-amber-300 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-amber-700">All 4 modules unlocked</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2-Section Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={twoSectionDiscountPct}
                    onChange={(e) => setTwoSectionDiscountPct(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">When buying any 2 sections</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3-Section Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={threeSectionDiscountPct}
                    onChange={(e) => setThreeSectionDiscountPct(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-500">When buying any 3 sections</p>
                </div>
              </div>
            </div>

            {/* Currency Option */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="block text-xs font-bold text-slate-800">Payment Currency</label>
                <span className="text-[11px] text-slate-500">Default processing currency for Razorpay checkout.</span>
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Saving Prices...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Save & Update Prices
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
