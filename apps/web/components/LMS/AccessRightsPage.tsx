"use client";

import React, { useState } from "react";
import {
  LabTeamMember,
  LabPlanEntitlements,
  ModuleKey,
  PlanType,
  updateMemberAccessRights,
  updateLabPlan,
} from "@/lib/api";

interface AccessRightsPageProps {
  labId: string;
  labName: string;
  isOwner: boolean;
  userRole: string;
  members: LabTeamMember[];
  planEntitlements: LabPlanEntitlements | null;
  onRefresh: () => void;
  onInviteClick?: () => void;
}

const MODULE_DEFINITIONS: {
  key: ModuleKey;
  title: string;
  icon: string;
  color: string;
  subPermissions: { key: keyof LabTeamMember["permissions"]; label: string; desc: string }[];
}[] = [
  {
    key: "STOCK",
    title: "Stock Management",
    icon: "📦",
    color: "from-amber-500 to-orange-600",
    subPermissions: [
      { key: "canViewStock", label: "View Inventory", desc: "Browse items, locations & categories" },
      { key: "canAddStock", label: "Add New Items", desc: "Register new stock items & batches" },
      { key: "canEditStock", label: "Edit Items", desc: "Modify item details, thresholds & tags" },
      { key: "canIssueStock", label: "Issue Items", desc: "Deduct items for lab usage" },
      { key: "canRestockStock", label: "Restock Items", desc: "Add inventory quantity restocks" },
      { key: "canManageStockSettings", label: "Manage Stock Settings", desc: "Configure locations & taxonomy" },
    ],
  },
  {
    key: "CRYO",
    title: "Cryo Storage & Samples",
    icon: "❄️",
    color: "from-cyan-500 to-blue-600",
    subPermissions: [
      { key: "canViewCryo", label: "View Cryo Storage", desc: "Browse freezers, racks & samples" },
      { key: "canAddCryo", label: "Add Samples", desc: "Store new cryo vials & specimens" },
      { key: "canEditCryo", label: "Edit Cryo Records", desc: "Modify sample metadata & positions" },
      { key: "canManageCryoSettings", label: "Manage Cryo Settings", desc: "Configure freezer layouts & alerts" },
    ],
  },
  {
    key: "LOGBOOK",
    title: "Logbook & Equipment",
    icon: "📖",
    color: "from-emerald-500 to-teal-600",
    subPermissions: [
      { key: "canViewLogbook", label: "View Logbook", desc: "Access lab logbook entries & history" },
      { key: "canCreateEntries", label: "Create Entries", desc: "Record new run logs & notes" },
      { key: "canEditOwnEntries", label: "Edit Own Entries", desc: "Modify self-created logbook entries" },
      { key: "canEditOthersEntries", label: "Edit Others' Entries", desc: "Modify team member log entries" },
      { key: "canManageInstruments", label: "Manage Equipment", desc: "Add & calibrate lab instruments" },
      { key: "canGenerateReports", label: "Generate Reports", desc: "Export usage & compliance reports" },
    ],
  },
  {
    key: "BUDGET",
    title: "Budget & Requisitions",
    icon: "💰",
    color: "from-indigo-500 to-violet-600",
    subPermissions: [
      { key: "canViewBudget", label: "View Budgets", desc: "Track allocation & expense balances" },
      { key: "canCreateBudget", label: "Submit Requisitions", desc: "Add expense/purchase submissions" },
      { key: "canEditBudget", label: "Edit Submissions", desc: "Modify pending requisition details" },
      { key: "canManageBudgetSettings", label: "Manage Budget Config", desc: "Setup budget heads & custom fields" },
    ],
  },
];

export function AccessRightsPage({
  labId,
  labName,
  isOwner,
  userRole,
  members,
  planEntitlements,
  onRefresh,
  onInviteClick,
}: AccessRightsPageProps) {
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>(
    planEntitlements?.planType || "TEAM_ADMIN_5"
  );
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(
    planEntitlements?.enabledModules || ["STOCK", "CRYO", "LOGBOOK", "BUDGET"]
  );
  const [savingPlan, setSavingPlan] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const canManage = isOwner || userRole === "ADMIN";
  const enabledModules = planEntitlements?.enabledModules || ["STOCK", "CRYO", "LOGBOOK", "BUDGET"];
  const isSingleUser = planEntitlements?.planType === "SINGLE_USER";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTogglePermission = async (
    memberUserId: string,
    permKey: keyof LabTeamMember["permissions"],
    currentVal: boolean
  ) => {
    if (!canManage) return;
    setUpdatingMemberId(memberUserId);
    try {
      await updateMemberAccessRights(labId, memberUserId, { [permKey]: !currentVal });
      showToast("Access rights updated successfully!");
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to update permission", "error");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleToggleModuleMaster = async (
    member: LabTeamMember,
    modDef: (typeof MODULE_DEFINITIONS)[0],
    turnOn: boolean
  ) => {
    if (!canManage) return;
    setUpdatingMemberId(member.id);
    try {
      const updates: Record<string, boolean> = {};
      modDef.subPermissions.forEach((sp) => {
        updates[sp.key] = turnOn;
      });
      await updateMemberAccessRights(labId, member.id, updates);
      showToast(`${modDef.title} ${turnOn ? "enabled" : "disabled"} for ${member.name}`);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to update module access", "error");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleSavePlanSettings = async () => {
    setSavingPlan(true);
    try {
      await updateLabPlan(labId, {
        planType: selectedPlanType,
        enabledModules: selectedModules,
      });
      showToast("Workspace subscription plan updated!");
      setShowPlanModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to save plan updates", "error");
    } finally {
      setSavingPlan(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-xl backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/30 bg-rose-950/90 text-rose-200"
          }`}
        >
          <span>{notification.type === "success" ? "✅" : "⚠️"}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Plan Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                ✨ {isSingleUser ? "Single User Plan" : "Team Plan (Admin + 4 Users)"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                ● Active Plan
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Access Rights & Subscription Entitlements
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Manage platform feature modules for {labName}. Purchased service bundles are globally active; unpurchased features remain disabled for all team members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanType(planEntitlements?.planType || "TEAM_ADMIN_5");
                  setSelectedModules(planEntitlements?.enabledModules || ["STOCK", "CRYO", "LOGBOOK", "BUDGET"]);
                  setShowPlanModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-violet-500 transition-all active:scale-95"
              >
                ⚙️ Configure Plan & Modules
              </button>
            )}
            {onInviteClick && !isSingleUser && (
              <button
                type="button"
                onClick={onInviteClick}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-all active:scale-95"
              >
                + Invite Team Member
              </button>
            )}
          </div>
        </div>

        {/* Seat Usage Bar & Modules List */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Seat Allocations</span>
              <span className="font-bold text-indigo-400">
                {planEntitlements?.activeSeats || members.length} / {planEntitlements?.maxSeats || (isSingleUser ? 1 : 5)} Seats
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isSingleUser
                    ? "bg-amber-400"
                    : (planEntitlements?.activeSeats || 0) >= 5
                    ? "bg-rose-500"
                    : "bg-indigo-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (((planEntitlements?.activeSeats || members.length) /
                      (planEntitlements?.maxSeats || (isSingleUser ? 1 : 5))) *
                      100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {isSingleUser
                ? "Single User Plan is limited to 1 member."
                : `${planEntitlements?.remainingSeats ?? 0} seats remaining out of 5.`}
            </p>
          </div>

          <div className="md:col-span-2 rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-2">
            <span className="text-xs font-semibold text-slate-300">Purchased Platforms & Service Bundles</span>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {MODULE_DEFINITIONS.map((m) => {
                const isActive = enabledModules.includes(m.key);
                return (
                  <div
                    key={m.key}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                      isActive
                        ? "bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-xs"
                        : "bg-slate-950/40 border-slate-800 text-slate-500 line-through opacity-70"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.title}</span>
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                        isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Access Rights Control Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Team Access Rights Matrix</h3>
            <p className="text-xs text-slate-500">
              Configure module permissions per team member. Unpurchased modules are grayed out.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400">
            No matching team members found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => {
              const isExpanded = expandedMemberId === member.id;
              const isOwnerMember = member.role === "OWNER";

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all overflow-hidden"
                >
                  {/* Member Header */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{member.name}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isOwnerMember
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : member.role === "ADMIN"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs transition-all"
                      >
                        <span>{isExpanded ? "Collapse Rights" : "Configure Access Rights"}</span>
                        <span>{isExpanded ? "▲" : "▼"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Module Cards Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MODULE_DEFINITIONS.map((modDef) => {
                      const isPurchased = enabledModules.includes(modDef.key);

                      // Check master enabled status for this module on this member
                      const anySubEnabled = modDef.subPermissions.some(
                        (sp) => Boolean(member.permissions[sp.key])
                      );

                      return (
                        <div
                          key={modDef.key}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                            !isPurchased
                              ? "border-slate-200 bg-slate-100/70 opacity-60"
                              : anySubEnabled
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-lg">{modDef.icon}</span>
                              {isPurchased ? (
                                <button
                                  type="button"
                                  disabled={!canManage || isOwnerMember || updatingMemberId === member.id}
                                  onClick={() => handleToggleModuleMaster(member, modDef, !anySubEnabled)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    anySubEnabled ? "bg-emerald-500" : "bg-slate-300"
                                  } ${
                                    !canManage || isOwnerMember ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      anySubEnabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="rounded-full bg-slate-200 border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  🔒 UNPURCHASED
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-xs text-slate-900">{modDef.title}</h4>
                            <p className="text-[11px] text-slate-500">
                              {isPurchased
                                ? anySubEnabled
                                  ? "Active & Granted"
                                  : "Disabled for Member"
                                : "Not included in workspace plan"}
                            </p>
                          </div>

                          {/* Sub-permissions breakdown if expanded */}
                          {isExpanded && isPurchased && (
                            <div className="pt-3 border-t border-slate-200/80 space-y-2">
                              {modDef.subPermissions.map((sp) => {
                                const isChecked = Boolean(member.permissions[sp.key]);
                                return (
                                  <label
                                    key={sp.key}
                                    className="flex items-start gap-2.5 cursor-pointer text-xs group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!canManage || isOwnerMember || updatingMemberId === member.id}
                                      onChange={() =>
                                        handleTogglePermission(member.id, sp.key, isChecked)
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                    <div>
                                      <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                        {sp.label}
                                      </span>
                                      <p className="text-[10px] text-slate-400">{sp.desc}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {!isPurchased && (
                            <div className="pt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-xl p-2 border border-amber-200/60">
                              💡 Upgrade plan to unlock {modDef.title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription Plan Config Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Workspace Plan & Service Bundle</h3>
                <p className="text-xs text-slate-400">
                  Select your active subscription tier and active platform modules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Plan Tier Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Select Plan Type
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlanType("SINGLE_USER")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selectedPlanType === "SINGLE_USER"
                      ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Single User</span>
                    <span className="text-xs font-bold text-indigo-400">1 Seat</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Individual plan for single researchers. Team invitations disabled.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlanType("TEAM_ADMIN_5")}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selectedPlanType === "TEAM_ADMIN_5"
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Team Admin+4</span>
                    <span className="text-xs font-bold text-emerald-400">5 Seats</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Team plan with 1 Admin + 4 Team Members & Access Rights page.
                  </p>
                </button>
              </div>
            </div>

            {/* Service Bundle Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Purchased Service / Package Bundle
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedModules(
                      selectedModules.length === 4
                        ? ["STOCK"]
                        : ["STOCK", "CRYO", "LOGBOOK", "BUDGET"]
                    )
                  }
                  className="text-xs font-semibold text-indigo-400 hover:underline"
                >
                  {selectedModules.length === 4 ? "Select Single Service" : "Select Full Package Bundle"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULE_DEFINITIONS.map((m) => {
                  const isChecked = selectedModules.includes(m.key);
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => {
                        if (isChecked) {
                          if (selectedModules.length === 1) return; // Keep at least 1 module
                          setSelectedModules(selectedModules.filter((x) => x !== m.key));
                        } else {
                          setSelectedModules([...selectedModules, m.key]);
                        }
                      }}
                      className={`rounded-2xl border p-3 text-left transition-all flex items-center justify-between ${
                        isChecked
                          ? "border-emerald-500 bg-emerald-950/40 text-white"
                          : "border-slate-800 bg-slate-950/40 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span>{m.icon}</span>
                        <span className="text-xs font-bold">{m.title}</span>
                      </div>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-400 text-black font-bold"
                            : "border-slate-700"
                        }`}
                      >
                        {isChecked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPlan}
                onClick={handleSavePlanSettings}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:from-indigo-400 hover:to-violet-500 active:scale-95 disabled:opacity-50"
              >
                {savingPlan ? "Saving..." : "Apply Plan Entitlements"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
