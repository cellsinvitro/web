"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminToolsGeneralSettings,
  updateAdminToolsGeneralSettings,
  updateAdminToolItem,
  fetchAdminToolPlans,
  createAdminToolPlan,
  updateAdminToolPlan,
  deleteAdminToolPlan,
  fetchAdminToolSubscribers,
  grantAdminToolSubscription,
  extendAdminToolSubscription,
  revokeAdminToolSubscription,
  fetchAdminToolUsage,
  overrideAdminUserQuota,
  resetAdminUserUsage,
  fetchAdminToolAnalytics,
  type ToolGeneralSetting,
  type ToolItem,
  type ToolSubscriptionPlan,
  type ToolSubscriberItem,
  type ToolUsageStats,
  type ToolAnalyticsData,
} from "@/lib/api";

type TabKey = "settings" | "plans" | "subscribers" | "usage" | "analytics";

export default function AdminToolsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // TAB A: General Settings State
  const [generalSetting, setGeneralSetting] = useState<ToolGeneralSetting | null>(null);
  const [toolsList, setToolsList] = useState<ToolItem[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // TAB B: Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    durationUnit: "DAY",
    durationValue: 1,
    regularPrice: 49,
    offerPrice: 9,
    offerEnabled: true,
    offerStartsAt: "",
    offerEndsAt: "",
    published: true,
    sortOrder: 1,
    description: "",
    featuresStr: "",
  });

  // TAB C: Subscribers State
  const [subscribers, setSubscribers] = useState<ToolSubscriberItem[]>([]);
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("ALL");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("");
  const [grantDays, setGrantDays] = useState(30);

  // TAB D: Usage State
  const [usageStats, setUsageStats] = useState<ToolUsageStats | null>(null);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideLimit, setOverrideLimit] = useState(5);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // TAB E: Analytics State
  const [analytics, setAnalytics] = useState<ToolAnalyticsData | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Loaders
  const loadTabA = async () => {
    try {
      const data = await fetchAdminToolsGeneralSettings();
      setGeneralSetting(data.generalSetting);
      setToolsList(data.tools);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load general settings");
    }
  };

  const loadTabB = async () => {
    try {
      const p = await fetchAdminToolPlans();
      setPlans(p);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load plans");
    }
  };

  const loadTabC = async () => {
    try {
      const subs = await fetchAdminToolSubscribers({ search: subSearch, status: subStatusFilter });
      setSubscribers(subs);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load subscribers");
    }
  };

  const loadTabD = async () => {
    try {
      const u = await fetchAdminToolUsage();
      setUsageStats(u);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load usage statistics");
    }
  };

  const loadTabE = async () => {
    try {
      const a = await fetchAdminToolAnalytics();
      setAnalytics(a);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to load analytics");
    }
  };

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      if (activeTab === "settings") await loadTabA();
      else if (activeTab === "plans") await loadTabB();
      else if (activeTab === "subscribers") await loadTabC();
      else if (activeTab === "usage") await loadTabD();
      else if (activeTab === "analytics") await loadTabE();
      setLoading(false);
    };
    run();
  }, [activeTab]);

  // Handle Tab A Save
  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalSetting) return;
    setSavingSettings(true);
    try {
      await updateAdminToolsGeneralSettings({
        dailyFreeLimit: Number(generalSetting.dailyFreeLimit),
        publicBrowseEnabled: generalSetting.publicBrowseEnabled,
        toolsSectionEnabled: generalSetting.toolsSectionEnabled,
        loginRequiredMessage: generalSetting.loginRequiredMessage,
        quotaExceededMessage: generalSetting.quotaExceededMessage,
        subscriptionCtaTitle: generalSetting.subscriptionCtaTitle,
        subscriptionCtaDescription: generalSetting.subscriptionCtaDescription,
      });
      showNotification("success", "General tools settings saved successfully.");
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Tool Definition Update
  const handleUpdateTool = async (key: string, updates: Partial<ToolItem>) => {
    try {
      const res = await updateAdminToolItem(key, updates);
      setToolsList((prev) => prev.map((t) => (t.key === key ? res.tool : t)));
      showNotification("success", `Updated ${res.tool.name}`);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to update tool");
    }
  };

  // Handle Plan Modal
  const openNewPlanModal = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      durationUnit: "DAY",
      durationValue: 1,
      regularPrice: 49,
      offerPrice: 9,
      offerEnabled: true,
      offerStartsAt: "",
      offerEndsAt: "",
      published: true,
      sortOrder: (plans.length || 0) + 1,
      description: "",
      featuresStr: "Unlimited calculations\nFull access to all scientific calculators",
    });
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      durationUnit: plan.durationUnit,
      durationValue: plan.durationValue,
      regularPrice: plan.regularPrice,
      offerPrice: plan.offerPrice ?? "",
      offerEnabled: plan.offerEnabled ?? true,
      offerStartsAt: plan.offerStartsAt ? plan.offerStartsAt.slice(0, 10) : "",
      offerEndsAt: plan.offerEndsAt ? plan.offerEndsAt.slice(0, 10) : "",
      published: plan.published ?? true,
      sortOrder: plan.sortOrder ?? 0,
      description: plan.description || "",
      featuresStr: (plan.features || []).join("\n"),
    });
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const features = planForm.featuresStr
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      if (editingPlan) {
        await updateAdminToolPlan(editingPlan.id, {
          name: planForm.name,
          durationUnit: planForm.durationUnit,
          durationValue: Number(planForm.durationValue),
          regularPrice: Number(planForm.regularPrice),
          offerPrice: planForm.offerPrice ? Number(planForm.offerPrice) : null,
          offerEnabled: planForm.offerEnabled,
          offerStartsAt: planForm.offerStartsAt ? new Date(planForm.offerStartsAt).toISOString() : null,
          offerEndsAt: planForm.offerEndsAt ? new Date(planForm.offerEndsAt).toISOString() : null,
          features,
          description: planForm.description,
          sortOrder: Number(planForm.sortOrder),
          published: planForm.published,
        });
        showNotification("success", `Updated plan "${planForm.name}"`);
      } else {
        await createAdminToolPlan({
          name: planForm.name,
          durationUnit: planForm.durationUnit,
          durationValue: Number(planForm.durationValue),
          regularPrice: Number(planForm.regularPrice),
          offerPrice: planForm.offerPrice ? Number(planForm.offerPrice) : null,
          offerEnabled: planForm.offerEnabled,
          offerStartsAt: planForm.offerStartsAt ? new Date(planForm.offerStartsAt).toISOString() : null,
          offerEndsAt: planForm.offerEndsAt ? new Date(planForm.offerEndsAt).toISOString() : null,
          features,
          description: planForm.description,
          sortOrder: Number(planForm.sortOrder),
          published: planForm.published,
        });
        showNotification("success", `Created plan "${planForm.name}"`);
      }
      setPlanModalOpen(false);
      await loadTabB();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to save plan");
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the plan "${name}"?`)) return;
    try {
      await deleteAdminToolPlan(id);
      showNotification("success", `Deleted plan "${name}"`);
      await loadTabB();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete plan");
    }
  };

  // Subscribers actions
  const handleExtendSubscriber = async (id: string, days: number) => {
    try {
      await extendAdminToolSubscription(id, { days });
      showNotification("success", `Extended subscription by ${days} days.`);
      await loadTabC();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to extend subscription");
    }
  };

  const handleRevokeSubscriber = async (id: string, email: string) => {
    if (!confirm(`Revoke unlimited tools access for ${email}?`)) return;
    try {
      await revokeAdminToolSubscription(id);
      showNotification("success", `Revoked access for ${email}`);
      await loadTabC();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to revoke subscription");
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    try {
      await grantAdminToolSubscription({
        userEmail: grantEmail.trim(),
        planId: grantPlanId || undefined,
        durationDays: Number(grantDays),
      });
      showNotification("success", `Granted access to ${grantEmail}`);
      setGrantModalOpen(false);
      setGrantEmail("");
      await loadTabC();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to grant access");
    }
  };

  // Usage actions
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideUserId) return;
    try {
      await overrideAdminUserQuota(overrideUserId, Number(overrideLimit));
      showNotification("success", "User quota override applied.");
      setOverrideModalOpen(false);
      await loadTabD();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to override quota");
    }
  };

  const handleResetUserUsage = async (userId: string, email: string) => {
    if (!confirm(`Reset today's usage for ${email}?`)) return;
    try {
      await resetAdminUserUsage(userId);
      showNotification("success", `Reset today's usage for ${email}`);
      await loadTabD();
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to reset usage");
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 max-w-7xl">
      {/* Page Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Admin Management
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
            Tools Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Configure scientific calculators, daily usage allowances, subscription tiers, subscribers, and live revenue analytics.
          </p>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-xs sm:text-sm font-semibold transition-all ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        {[
          { key: "settings", label: "Tab A — General Settings" },
          { key: "plans", label: "Tab B — Subscription Plans" },
          { key: "subscribers", label: "Tab C — Subscribers" },
          { key: "usage", label: "Tab D — Tool Usage" },
          { key: "analytics", label: "Tab E — Tools Analytics" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`whitespace-nowrap py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB A: GENERAL SETTINGS */}
      {activeTab === "settings" && (
        <div className="mt-8 space-y-8">
          {generalSetting ? (
            <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                <h2 className="text-lg font-bold text-slate-950 border-b border-slate-100 pb-3">
                  Global Access &amp; Quota Settings
                </h2>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Default Daily Free Limit (Calculations / Day)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={generalSetting.dailyFreeLimit}
                      onChange={(e) =>
                        setGeneralSetting({
                          ...generalSetting,
                          dailyFreeLimit: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Standard allowance shared across all tools for registered users (Initial default: 1).
                    </span>
                  </label>

                  <div className="space-y-4 pt-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generalSetting.toolsSectionEnabled}
                        onChange={(e) =>
                          setGeneralSetting({
                            ...generalSetting,
                            toolsSectionEnabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Tools Section Active
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generalSetting.publicBrowseEnabled}
                        onChange={(e) =>
                          setGeneralSetting({
                            ...generalSetting,
                            publicBrowseEnabled: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Public Browsing Enabled (Anonymous visitors can view tool forms)
                      </span>
                    </label>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Login-Required Prompt Message
                    </span>
                    <input
                      type="text"
                      value={generalSetting.loginRequiredMessage}
                      onChange={(e) =>
                        setGeneralSetting({
                          ...generalSetting,
                          loginRequiredMessage: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Daily Quota-Exhausted Prompt Message
                    </span>
                    <input
                      type="text"
                      value={generalSetting.quotaExceededMessage}
                      onChange={(e) =>
                        setGeneralSetting({
                          ...generalSetting,
                          quotaExceededMessage: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Subscription CTA Title
                    </span>
                    <input
                      type="text"
                      value={generalSetting.subscriptionCtaTitle}
                      onChange={(e) =>
                        setGeneralSetting({
                          ...generalSetting,
                          subscriptionCtaTitle: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Subscription CTA Supporting Description
                    </span>
                    <textarea
                      rows={2}
                      value={generalSetting.subscriptionCtaDescription}
                      onChange={(e) =>
                        setGeneralSetting({
                          ...generalSetting,
                          subscriptionCtaDescription: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingSettings ? "Saving Settings..." : "Save General Settings"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-500">Loading settings...</p>
          )}

          {/* Individual Tool Management Section */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Scientific Calculators Registry</h2>
                <p className="text-xs text-slate-500">Order and visibility on the Tools main page.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {toolsList.map((tool) => (
                <div
                  key={tool.key}
                  className="rounded-2xl border border-slate-200 p-4.5 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{tool.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Sort: #{tool.sortOrder}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{tool.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500 font-mono">{tool.route}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tool.published}
                        onChange={(e) => handleUpdateTool(tool.key, { published: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-950"
                      />
                      <span className="text-xs font-medium text-slate-700">Published</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: SUBSCRIPTION PLANS */}
      {activeTab === "plans" && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-slate-600">
              Manage editable pricing tiers (Daily, Weekly, Monthly, Yearly).
            </p>
            <button
              type="button"
              onClick={openNewPlanModal}
              className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              + Create New Plan
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Plan Name</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Regular Price</th>
                  <th className="px-4 py-3.5">Offer Price</th>
                  <th className="px-4 py-3.5">Offer Active</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-bold text-slate-900">{plan.name}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {plan.durationValue} {plan.durationUnit?.toLowerCase()}(s)
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">₹{plan.regularPrice}</td>
                    <td className="px-4 py-4 font-bold text-slate-950">
                      {plan.offerPrice !== null ? `₹${plan.offerPrice}` : "—"}
                    </td>
                    <td className="px-4 py-4">
                      {plan.offerEnabled ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {plan.published ? (
                        <span className="text-xs font-semibold text-emerald-600">Published</span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Draft</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditPlanModal(plan)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plan Modal Form */}
          {planModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-950">
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create New Plan"}
                </h3>

                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Plan Name</span>
                      <input
                        type="text"
                        required
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        placeholder="e.g. 1 Month"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Duration Unit</span>
                      <select
                        value={planForm.durationUnit}
                        onChange={(e) => setPlanForm({ ...planForm, durationUnit: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none bg-white"
                      >
                        <option value="DAY">Days</option>
                        <option value="WEEK">Weeks</option>
                        <option value="MONTH">Months</option>
                        <option value="YEAR">Years</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Duration Value</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={planForm.durationValue}
                        onChange={(e) => setPlanForm({ ...planForm, durationValue: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Sort Order</span>
                      <input
                        type="number"
                        min="0"
                        value={planForm.sortOrder}
                        onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Regular Price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={planForm.regularPrice}
                        onChange={(e) => setPlanForm({ ...planForm, regularPrice: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-600 mb-1">Offer Price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        value={planForm.offerPrice}
                        onChange={(e) => setPlanForm({ ...planForm, offerPrice: e.target.value ? Number(e.target.value) : ("" as any) })}
                        placeholder="Leave blank if no offer"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex gap-4 items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={planForm.offerEnabled}
                        onChange={(e) => setPlanForm({ ...planForm, offerEnabled: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Enable Offer Price
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={planForm.published}
                        onChange={(e) => setPlanForm({ ...planForm, published: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      Published on Tools page
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Description</span>
                    <input
                      type="text"
                      value={planForm.description}
                      onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                      placeholder="e.g. 7 days of bench calculations"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">
                      Features List (One feature per line)
                    </span>
                    <textarea
                      rows={3}
                      value={planForm.featuresStr}
                      onChange={(e) => setPlanForm({ ...planForm, featuresStr: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPlanModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Save Plan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB C: SUBSCRIBERS */}
      {activeTab === "subscribers" && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTabC()}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none w-64"
              />
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
              <button
                type="button"
                onClick={loadTabC}
                className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"
              >
                Filter
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGrantModalOpen(true)}
              className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              + Grant Access Manually
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Purchased</th>
                  <th className="px-4 py-3.5">Expires</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Payment Ref</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribers.map((sub) => {
                  const isExpired = new Date(sub.expiresAt) < new Date();
                  const effectiveStatus = isExpired && sub.status === "ACTIVE" ? "EXPIRED" : sub.status;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{sub.user?.name || "—"}</div>
                        <div className="text-xs text-slate-500 font-mono">{sub.user?.email}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {sub.plan?.name || "Custom Unlimited"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {new Date(sub.startsAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-900 font-medium">
                        {new Date(sub.expiresAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            effectiveStatus === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : effectiveStatus === "REVOKED"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {effectiveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500 truncate max-w-28">
                        {sub.payment?.providerPaymentId || sub.payment?.id || "Manual/Admin"}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleExtendSubscriber(sub.id, 7)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          +7 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExtendSubscriber(sub.id, 30)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          +30 Days
                        </button>
                        {effectiveStatus === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSubscriber(sub.id, sub.user?.email || "")}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {subscribers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                      No subscribers found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grant Modal */}
          {grantModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-950">Grant Tools Subscription</h3>
                <form onSubmit={handleGrantSubmit} className="space-y-4">
                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">User Email</span>
                    <input
                      type="email"
                      required
                      value={grantEmail}
                      onChange={(e) => setGrantEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Duration (Days)</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={grantDays}
                      onChange={(e) => setGrantDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setGrantModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Grant Access
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB D: TOOL USAGE MANAGEMENT */}
      {activeTab === "usage" && (
        <div className="mt-8 space-y-6">
          {usageStats ? (
            <>
              {/* Metrics cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Calculations Today</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">{usageStats.totalCalculationsToday}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Users Using Tools</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">{usageStats.uniqueUsersToday}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Free Calculations</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">{usageStats.freeCalculations}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscriber Calculations</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-600">{usageStats.subscriberCalculations}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Users at Daily Quota</p>
                  <p className="mt-2 text-3xl font-extrabold text-amber-600">{usageStats.usersAtQuota}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-600">{usageStats.activeSubscribers}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Global Quota</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">{usageStats.defaultLimit}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">per user / day</p>
                </div>
              </div>

              {/* Usage Breakdown By Calculator */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Today's Volume by Scientific Calculator
                </h3>
                <div className="grid gap-4 sm:grid-cols-4 pt-1">
                  {Object.entries(usageStats.toolBreakdown).map(([key, count]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs font-semibold capitalize text-slate-700">{key.replace("-", " ")}</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-950">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Users List Table */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Users with Calculations Today ({usageStats.date})
                </h3>

                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Calculations Today</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usageStats.usersList.map((item) => (
                        <tr key={item.user.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>{item.user.name || "—"}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            {item.isSubscriber ? (
                              <span className="text-xs font-bold text-emerald-600">Subscriber (Unlimited)</span>
                            ) : (
                              <span className="text-xs text-slate-500">Free User</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-950">{item.count}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setOverrideUserId(item.user.id);
                                setOverrideLimit(10);
                                setOverrideModalOpen(true);
                              }}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Override Limit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetUserUsage(item.user.id, item.user.email)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Reset Today
                            </button>
                          </td>
                        </tr>
                      ))}
                      {usageStats.usersList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                            No calculations recorded yet today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading usage data...</p>
          )}

          {/* Quota Override Modal */}
          {overrideModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-bold text-slate-950">Override User Daily Limit</h3>
                <form onSubmit={handleOverrideSubmit} className="space-y-4">
                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1">New Daily Limit</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      required
                      value={overrideLimit}
                      onChange={(e) => setOverrideLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"
                    />
                  </label>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOverrideModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Apply Override
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB E: TOOLS ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="mt-8 space-y-6">
          {analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">₹{analytics.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Paid Subscribers</p>
                  <p className="mt-2 text-3xl font-extrabold text-emerald-600">{analytics.activeSubscribers}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Renewals & Expirations</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    <span className="text-emerald-700">{analytics.totalRenewals ?? 0}</span> renewed /{" "}
                    <span className="text-slate-500">{analytics.totalExpirations ?? 0}</span> expired
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Most-Used Calculator</p>
                  <p className="mt-2 text-lg font-bold text-slate-950 truncate">{analytics.mostUsedCalculator}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Free-to-Paid Conversion</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">{analytics.conversionRate}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{analytics.totalSubscribedUsers} of {analytics.totalRegisteredUsers} users</p>
                </div>
              </div>

              {/* Daily Calculation Volume (Past 7 Days) */}
              {analytics.dailyVolume && analytics.dailyVolume.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                    Daily Calculation Volume (Past 7 Days)
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-7 pt-1">
                    {analytics.dailyVolume.map((d) => (
                      <div key={d.date} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                        <p className="text-[11px] font-medium text-slate-500">{d.date}</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-950">{d.count}</p>
                        <p className="text-[10px] text-slate-400">calculations</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue by Plan Breakdown */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Revenue Breakdown by Plan
                </h3>
                <div className="grid gap-4 sm:grid-cols-4 pt-1">
                  {analytics.revenueByPlan.map((item) => (
                    <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold text-slate-700">{item.name}</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-950">₹{item.revenue.toLocaleString()}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.count} purchase(s)</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Calculator Volume Breakdown */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  All-Time Calculation Volume by Tool
                </h3>
                <div className="grid gap-4 sm:grid-cols-4 pt-1">
                  {Object.entries(analytics.usageByTool).map(([tool, count]) => (
                    <div key={tool} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold capitalize text-slate-700">{tool.replace("-", " ")}</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-950">{count}</p>
                    </div>
                  ))}
                  {Object.keys(analytics.usageByTool).length === 0 && (
                    <p className="text-xs text-slate-400 col-span-4">No historical tool usage recorded yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading analytics...</p>
          )}
        </div>
      )}
    </div>
  );
}
