"use client";

import React, { useState, useEffect } from "react";
import {
  fetchAdminLmsSettings,
  updateAdminLmsSettings,
  uploadAdminLmsBannerImage,
  deleteAdminLmsBannerImage,
  fetchAdminLmsPayments,
  type LmsSettings,
} from "@/lib/api";

export default function AdminLmsTab() {
  const [settings, setSettings] = useState<LmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadSettingsData = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetchAdminLmsSettings();
      setSettings(res.settings);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load LMS settings", isError: true });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadPaymentsData = async () => {
    try {
      setLoadingPayments(true);
      const res = await fetchAdminLmsPayments();
      setPayments(res.payments);
    } catch (err: any) {
      console.error("Failed to load LMS payments", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadPaymentsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await updateAdminLmsSettings(settings);
      setSettings(res.settings);
      setMessage({ text: "LMS settings and prices saved successfully!" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save settings", isError: true });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMasterPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingMaster(true);
    setMessage(null);
    try {
      const res = await updateAdminLmsSettings({
        bannerImageUrl: settings.bannerImageUrl ?? null,
        bannerTitle: settings.bannerTitle,
        bannerSubtitle: settings.bannerSubtitle,
        bannerBadge: settings.bannerBadge,
        bannerCtaLabel: settings.bannerCtaLabel,
        bannerCtaHref: settings.bannerCtaHref,
        bannerSecondaryLabel: settings.bannerSecondaryLabel,
        bannerSecondaryHref: settings.bannerSecondaryHref,
      });
      setSettings(res.settings);
      setMessage({ text: "LMS Banner settings saved successfully!" });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to save banner settings", isError: true });
    } finally {
      setSavingMaster(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBanner(true);
    setMessage(null);
    try {
      const res = await uploadAdminLmsBannerImage(file);
      setSettings(res.settings);
      setMessage({ text: "Banner image uploaded and applied!" });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to upload banner image", isError: true });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBannerImage = async () => {
    setUploadingBanner(true);
    setMessage(null);
    try {
      const res = await deleteAdminLmsBannerImage();
      setSettings(res.settings);
      setMessage({ text: "Custom banner image removed." });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to remove banner image", isError: true });
    } finally {
      setUploadingBanner(false);
    }
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            message.isError
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* 0. LMS Banner Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              LMS Page Banner
            </h3>
            <p className="text-xs text-slate-500">
              Customize the hero banner image, heading, and CTA links displayed on the LMS page (<code className="font-mono text-slate-700">/LMS</code>).
            </p>
          </div>
          <a
            href="/LMS"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Preview LMS Page ↗
          </a>
        </div>

        {loadingSettings ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading banner configuration...</div>
        ) : settings ? (
          <form onSubmit={handleSaveMasterPage} className="space-y-8">
            {/* Banner Preview & Image Upload */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Hero Banner Image</h4>
                  <p className="text-[11px] text-slate-500">
                    Upload a wide landscape banner image (JPEG, PNG, WEBP, SVG up to 10 MB) or enter an image URL.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition">
                    {uploadingBanner ? "Uploading..." : "Upload Banner Image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                      className="hidden"
                    />
                  </label>
                  {settings.bannerImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveBannerImage}
                      disabled={uploadingBanner}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>

              {/* Live Visual Banner Preview */}
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white min-h-[150px] flex items-center p-6">
                {settings.bannerImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={settings.bannerImageUrl}
                    alt="LMS Banner Preview"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/35" />
                <div className="relative z-10 max-w-xl">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                    CellsInVitro &rsaquo; {settings.bannerBadge || "Lab Management Suite"}
                  </div>
                  <div className="mt-1.5 text-xl font-bold tracking-tight text-white">
                    {settings.bannerTitle || "Lab Management Suite (LMS)"}
                  </div>
                  <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                    {settings.bannerSubtitle}
                  </p>
                  <span className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-950">
                    {settings.bannerCtaLabel || "Contact us"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Image URL (optional manual override)
                </label>
                <input
                  type="text"
                  value={settings.bannerImageUrl || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, bannerImageUrl: e.target.value || null })
                  }
                  placeholder="https://... or upload an image above"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Breadcrumb / Eyebrow Label
                  </label>
                  <input
                    type="text"
                    value={settings.bannerBadge || ""}
                    onChange={(e) => setSettings({ ...settings, bannerBadge: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banner Title
                  </label>
                  <input
                    type="text"
                    value={settings.bannerTitle || ""}
                    onChange={(e) => setSettings({ ...settings, bannerTitle: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Subtitle
                </label>
                <textarea
                  rows={2}
                  value={settings.bannerSubtitle || ""}
                  onChange={(e) => setSettings({ ...settings, bannerSubtitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banner CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.bannerCtaLabel || ""}
                    onChange={(e) => setSettings({ ...settings, bannerCtaLabel: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banner CTA Link
                  </label>
                  <input
                    type="text"
                    value={settings.bannerCtaHref || ""}
                    onChange={(e) => setSettings({ ...settings, bannerCtaHref: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tab-Bar Right Action Text
                  </label>
                  <input
                    type="text"
                    value={settings.bannerSecondaryLabel || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, bannerSecondaryLabel: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tab-Bar Right Action Link
                  </label>
                  <input
                    type="text"
                    value={settings.bannerSecondaryHref || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, bannerSecondaryHref: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingMaster}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {savingMaster ? "Saving Banner..." : "Save Banner"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* 1. LMS Pricing & Discount Rules */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-1">LMS Section Pricing & Bundle Rules</h3>
        <p className="text-xs text-slate-500 mb-6">
          Set baseline prices for each module, configure bundle discount percentages (for 2 or 3 combined sections), and define Full LMS Pass pricing.
        </p>

        {loadingSettings ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading pricing configuration...</div>
        ) : settings ? (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Repo / Cryo Storage (₹)
                </label>
                <input
                  type="number"
                  value={settings.repoPrice / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, repoPrice: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stock Inventory (₹)
                </label>
                <input
                  type="number"
                  value={settings.stockPrice / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, stockPrice: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Budget Management (₹)
                </label>
                <input
                  type="number"
                  value={settings.budgetPrice / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, budgetPrice: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lab Logbook & Protocols (₹)
                </label>
                <input
                  type="number"
                  value={settings.logbookPrice / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, logbookPrice: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2-Section Bundle Discount (%)
                </label>
                <input
                  type="number"
                  value={settings.twoSectionDiscountPct}
                  onChange={(e) =>
                    setSettings({ ...settings, twoSectionDiscountPct: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  min={0}
                  max={100}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3-Section Bundle Discount (%)
                </label>
                <input
                  type="number"
                  value={settings.threeSectionDiscountPct}
                  onChange={(e) =>
                    setSettings({ ...settings, threeSectionDiscountPct: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  min={0}
                  max={100}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Pass (All 4 Sections) (₹)
                </label>
                <input
                  type="number"
                  value={settings.fullAccessPrice / 100}
                  onChange={(e) =>
                    setSettings({ ...settings, fullAccessPrice: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-blue-700 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {savingSettings ? "Saving Settings..." : "Save Pricing & Discount Rules"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* 2. LMS Payment Audit Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-1">LMS Payment History</h3>
        <p className="text-xs text-slate-500 mb-6">Recent LMS purchases and section unlocks.</p>

        {loadingPayments ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading LMS payment history...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">No LMS payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">Date</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Purchased Sections</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{p.user?.name || "Customer"}</div>
                      <div className="text-slate-500 text-[11px]">{p.user?.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">
                        {p.lmsSections.map((s: string) => s.replace("lms_", "")).join(", ")}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      ₹{(p.amount / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
