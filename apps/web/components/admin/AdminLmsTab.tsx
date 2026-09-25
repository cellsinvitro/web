"use client";

import React, { useState, useEffect } from "react";
import {
  fetchAdminLmsSettings,
  updateAdminLmsSettings,
  fetchAdminLmsUsers,
  grantAdminLmsAccess,
  fetchAdminLmsPayments,
  type LmsSettings,
  type AdminLmsUser,
} from "@/lib/api";

export default function AdminLmsTab() {
  const [settings, setSettings] = useState<LmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

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
