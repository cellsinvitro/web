"use client";

import React, { useState, useEffect } from "react";
import {
  fetchAdminLmsSettings,
  updateAdminLmsSettings,
  uploadAdminLmsBannerImage,
  deleteAdminLmsBannerImage,
  fetchAdminLmsUsers,
  grantAdminLmsAccess,
  fetchAdminLmsPayments,
  type LmsSettings,
  type LmsMasterTab,
  type AdminLmsUser,
} from "@/lib/api";

const DEFAULT_TAB_DRAFT: LmsMasterTab = {
  id: "",
  label: "New Tab",
  headline: "",
  description: "",
  highlights: [],
  ctaLabel: "",
  ctaHref: "",
};

export default function AdminLmsTab() {
  const [settings, setSettings] = useState<LmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMaster, setSavingMaster] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [expandedTabIdx, setExpandedTabIdx] = useState<number | null>(0);

  // Users state
  const [users, setUsers] = useState<AdminLmsUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [grantingUser, setGrantingUser] = useState<string | null>(null);

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

  const loadUsersData = async (query?: string) => {
    try {
      setLoadingUsers(true);
      const res = await fetchAdminLmsUsers(query);
      setUsers(res.users);
    } catch (err: any) {
      console.error("Failed to load LMS users", err);
    } finally {
      setLoadingUsers(false);
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
    loadUsersData();
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
        masterTabs: settings.masterTabs,
      });
      setSettings(res.settings);
      setMessage({ text: "LMS Master Page banner and tabs saved successfully!" });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to save Master Page settings", isError: true });
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

  const masterTabs = settings?.masterTabs ?? [];

  const updateTabAt = (idx: number, patch: Partial<LmsMasterTab>) => {
    if (!settings) return;
    const next = [...masterTabs];
    const current = next[idx];
    if (!current) return;
    next[idx] = { ...current, ...patch };
    setSettings({ ...settings, masterTabs: next });
  };

  const moveTab = (idx: number, direction: -1 | 1) => {
    if (!settings) return;
    const target = idx + direction;
    if (target < 0 || target >= masterTabs.length) return;
    const next = [...masterTabs];
    const temp = next[idx]!;
    next[idx] = next[target]!;
    next[target] = temp;
    setSettings({ ...settings, masterTabs: next });
    setExpandedTabIdx(target);
  };

  const addTab = () => {
    if (!settings) return;
    const newIdx = masterTabs.length + 1;
    const next = [
      ...masterTabs,
      {
        ...DEFAULT_TAB_DRAFT,
        id: `tab-${Date.now()}`,
        label: `Section ${newIdx}`,
        headline: "Custom LMS section headline",
        description: "Describe the workflow, capability, or guidance shown under this tab.",
        highlights: ["Key highlight point"],
      },
    ];
    setSettings({ ...settings, masterTabs: next });
    setExpandedTabIdx(next.length - 1);
  };

  const removeTab = (idx: number) => {
    if (!settings || masterTabs.length <= 1) return;
    const next = masterTabs.filter((_, i) => i !== idx);
    setSettings({ ...settings, masterTabs: next });
    setExpandedTabIdx(null);
  };

  const handleGrant = async (userId: string, section: string, action: "GRANT" | "REVOKE") => {
    setGrantingUser(`${userId}-${section}-${action}`);
    setMessage(null);
    try {
      const res = await grantAdminLmsAccess({ userId, section, action });
      setMessage({ text: res.message });
      await loadUsersData(userSearch);
    } catch (err: any) {
      setMessage({ text: err.message || "Grant operation failed", isError: true });
    } finally {
      setGrantingUser(null);
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

      {/* 0. LMS Master Page Banner & Tabs Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              LMS Master Page Banner &amp; Tabs
            </h3>
            <p className="text-xs text-slate-500">
              Customize the hero banner image, heading, CTA links, and editable tabs displayed on the LMS Suite Master Page (<code className="font-mono text-slate-700">/LMS</code>).
            </p>
          </div>
          <a
            href="/LMS"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Preview Master Page ↗
          </a>
        </div>

        {loadingSettings ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading banner &amp; tab configuration...</div>
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

            {/* Editable Tabs Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Master Page Tabs ({masterTabs.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add, reorder, rename, or update the content of each horizontal tab shown beneath the LMS banner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addTab}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  + Add Tab
                </button>
              </div>

              <div className="space-y-3">
                {masterTabs.map((tab, idx) => {
                  const isExpanded = expandedTabIdx === idx;
                  return (
                    <div
                      key={tab.id || idx}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedTabIdx(isExpanded ? null : idx)}
                        className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 cursor-pointer hover:bg-slate-100/70"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900">
                              {tab.label || "Untitled Tab"}
                            </span>
                            {tab.headline && (
                              <p className="truncate text-[11px] text-slate-500 max-w-md">
                                {tab.headline}
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => moveTab(idx, -1)}
                            disabled={idx === 0}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTab(idx, 1)}
                            disabled={idx === masterTabs.length - 1}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTab(idx)}
                            disabled={masterTabs.length <= 1}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-40"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedTabIdx(isExpanded ? null : idx)}
                            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600"
                          >
                            {isExpanded ? "▲" : "▼"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tab Label (shown in tab bar)
                              </label>
                              <input
                                type="text"
                                value={tab.label}
                                onChange={(e) => updateTabAt(idx, { label: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tab Headline
                              </label>
                              <input
                                type="text"
                                value={tab.headline}
                                onChange={(e) => updateTabAt(idx, { headline: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tab Description
                            </label>
                            <textarea
                              rows={3}
                              value={tab.description}
                              onChange={(e) => updateTabAt(idx, { description: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Key Highlights (one per line)
                            </label>
                            <textarea
                              rows={3}
                              value={(tab.highlights || []).join("\n")}
                              onChange={(e) =>
                                updateTabAt(idx, {
                                  highlights: e.target.value.split("\n"),
                                })
                              }
                              placeholder="Enter bullet highlights, one per line..."
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tab CTA Label (optional)
                              </label>
                              <input
                                type="text"
                                value={tab.ctaLabel || ""}
                                onChange={(e) => updateTabAt(idx, { ctaLabel: e.target.value })}
                                placeholder="e.g. Explore Modules"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tab CTA Link (optional)
                              </label>
                              <input
                                type="text"
                                value={tab.ctaHref || ""}
                                onChange={(e) => updateTabAt(idx, { ctaHref: e.target.value })}
                                placeholder="e.g. #lms-modules or /contact"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingMaster}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {savingMaster ? "Saving Master Page..." : "Save Banner & Tabs"}
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

      {/* 2. User Access Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">User Access Control</h3>
            <p className="text-xs text-slate-500">
              Grant or revoke user access for specific LMS sections or full LMS access.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search user email or name..."
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                loadUsersData(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-300 pl-3 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading users list...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Active Section Accesses</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const unlockedList = u.lmsAccesses.map((a) => a.section);
                  const isFull = unlockedList.includes("lms_full") || u.role === "ADMIN";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{u.name || "N/A"}</div>
                        <div className="text-slate-500 text-[11px]">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {u.role === "ADMIN" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              Full Access (Admin)
                            </span>
                          ) : isFull ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Full LMS Pass
                            </span>
                          ) : unlockedList.length === 0 ? (
                            <span className="text-slate-400 text-[11px]">Free Section Only</span>
                          ) : (
                            unlockedList.map((sec) => (
                              <span
                                key={sec}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {sec.replace("lms_", "")}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isFull ? (
                            <button
                              onClick={() => handleGrant(u.id, "lms_full", "REVOKE")}
                              disabled={Boolean(grantingUser)}
                              className="px-2.5 py-1 rounded bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 disabled:opacity-50"
                            >
                              Revoke All
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleGrant(u.id, "lms_full", "GRANT")}
                                disabled={Boolean(grantingUser)}
                                className="px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50"
                              >
                                Grant Full Pass
                              </button>

                              {["lms_repo", "lms_stock", "lms_budget", "lms_logbook"].map((secKey) => {
                                const hasSec = unlockedList.includes(secKey);
                                return (
                                  <button
                                    key={secKey}
                                    onClick={() => handleGrant(u.id, secKey, hasSec ? "REVOKE" : "GRANT")}
                                    disabled={Boolean(grantingUser)}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold ${
                                      hasSec
                                        ? "bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                  >
                                    {hasSec ? `Revoke ${secKey.replace("lms_", "")}` : `+ ${secKey.replace("lms_", "")}`}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. LMS Payment Audit Log */}
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
