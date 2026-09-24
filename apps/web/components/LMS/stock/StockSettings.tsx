"use client";

import { useEffect, useState, useCallback } from "react";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockInit,
  fetchStockSettings,
  updateStockSettings,
  fetchStockCategories,
  createStockCategory,
  deleteStockCategory,
  fetchStockTags,
  createStockTag,
  deleteStockTag,
  fetchStockLocations,
  createStockLocation,
  deleteStockLocation,
  fetchStockMembers,
  updateMemberStockPermissions,
  removeStockMember,
  addStockMemberByEmail,
  fetchStockLabInvites,
  deleteStockLabInvite,
  resendStockLabInvite,
  type StockSettings,
  type StockCategory,
  type StockTag,
  type StockLocation,
  type StockPermissions,
  type StockLabInvite,
} from "@/lib/api";

const PERMISSION_LABELS: Array<{ key: keyof StockPermissions; label: string; desc: string }> = [
  { key: "canViewStock",           label: "View Stock",              desc: "Can see inventory and dashboard" },
  { key: "canAddStock",            label: "Add Stock",               desc: "Can create new stock records" },
  { key: "canEditStock",           label: "Edit Details",            desc: "Can edit item metadata" },
  { key: "canIssueStock",          label: "Issue Stock",             desc: "Can issue items for lab use" },
  { key: "canRestockStock",        label: "Restock / Out",           desc: "Can receive stock and record losses" },
  { key: "canManageStockSettings", label: "Manage Settings",         desc: "Can manage locations, categories, tags, permissions" },
];

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 transition-all";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

function Section({
  title,
  sub,
  icon,
  action,
  children,
}: {
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function StockSettings() {
  const { activeLab } = useLabWorkspace();
  const [permissions, setPermissions] = useState<StockPermissions | null>(null);
  const [settings, setSettings] = useState<StockSettings | null>(null);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [tags, setTags] = useState<StockTag[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchStockMembers>>["members"]>([]);
  const [invites, setInvites] = useState<StockLabInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newCat, setNewCat] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [newLocParent, setNewLocParent] = useState("");

  const [lowThreshold, setLowThreshold] = useState(5);
  const [nearExpiry, setNearExpiry] = useState(90);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [addPerms, setAddPerms] = useState<StockPermissions>({
    canViewStock: true,
    canAddStock: true,
    canEditStock: false,
    canIssueStock: true,
    canRestockStock: false,
    canManageStockSettings: false,
  });
  const [addingMember, setAddingMember] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const load = useCallback(async (labId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [initRes, settingsRes, catRes, tagRes, locRes, membersRes, invitesRes] = await Promise.all([
        fetchStockInit(labId),
        fetchStockSettings(labId),
        fetchStockCategories(labId),
        fetchStockTags(labId),
        fetchStockLocations(labId),
        fetchStockMembers(labId),
        fetchStockLabInvites(labId),
      ]);
      setPermissions(initRes.permissions);
      setSettings(settingsRes);
      setLowThreshold(settingsRes.lowStockThreshold);
      setNearExpiry(settingsRes.nearExpiryDays);
      setCategories(catRes.categories);
      setTags(tagRes.tags);
      setLocations(locRes.locations);
      setMembers(membersRes.members);
      setInvites(invitesRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeLab) return;
    load(activeLab.id);
  }, [activeLab?.id, load]);

  if (!activeLab) {
    return <div className="py-16 text-center text-sm text-slate-500">No lab workspace selected.</div>;
  }

  const labId = activeLab.id;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!permissions?.canManageStockSettings) {
    return (
      <div className="max-w-7xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">You do not have permission to manage stock settings.</p>
      </div>
    );
  }

  // Handlers
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateStockSettings(labId, { lowStockThreshold: lowThreshold, nearExpiryDays: nearExpiry });
      setSettings(updated);
      showSuccess("Settings saved successfully");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    try {
      const cat = await createStockCategory(labId, { name: newCat.trim() });
      setCategories((prev) => [...prev, cat]);
      setNewCat("");
      showSuccess("Category added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Items using it will become uncategorised.")) return;
    try {
      await deleteStockCategory(labId, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showSuccess("Category deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot delete category — items may be using it");
    }
  }

  async function addTag() {
    if (!newTag.trim()) return;
    try {
      const tag = await createStockTag(labId, { name: newTag.trim() });
      setTags((prev) => [...prev, tag]);
      setNewTag("");
      showSuccess("Tag added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add tag");
    }
  }

  async function deleteTag(id: string) {
    if (!confirm("Delete this tag?")) return;
    try {
      await deleteStockTag(labId, id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      showSuccess("Tag deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete tag");
    }
  }

  async function addLocation() {
    if (!newLoc.trim()) return;
    try {
      const loc = await createStockLocation(labId, { name: newLoc.trim(), parentId: newLocParent || undefined });
      setLocations((prev) => [...prev, loc]);
      setNewLoc("");
      setNewLocParent("");
      showSuccess("Location added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add location");
    }
  }

  async function deleteLocation(id: string) {
    if (!confirm("Delete this location?")) return;
    try {
      await deleteStockLocation(labId, id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      showSuccess("Location deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot delete location — items may be using it");
    }
  }

  async function togglePermission(memberId: string, key: keyof StockPermissions, current: boolean) {
    try {
      await updateMemberStockPermissions(labId, memberId, { [key]: !current });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, [key]: !current } : m))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update permission");
    }
  }

  async function handleAddMemberByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddingMember(true);
    setError(null);
    try {
      const res = await addStockMemberByEmail(labId, {
        email: addEmail.trim(),
        role: addRole,
        permissions: addPerms,
      });

      if (res.pending && res.invite) {
        setInvites((prev) => [res.invite, ...prev]);
        showSuccess(res.message || `Invitation sent to '${addEmail}'. Status is PENDING until accepted.`);
      }

      setShowAddModal(false);
      setAddEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite member");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleResendInvite(inviteId: string) {
    try {
      const res = await resendStockLabInvite(labId, inviteId);
      showSuccess(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend invite");
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!confirm("Cancel / revoke this pending invitation?")) return;
    try {
      await deleteStockLabInvite(labId, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      showSuccess("Invitation cancelled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel invite");
    }
  }

  function handleCopyInviteLink(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/cyrosearch/invite/accept?token=${token}`;
    navigator.clipboard.writeText(link);
    showSuccess("Invite link copied to clipboard!");
  }

  async function handleRemoveMember(memberId: string, nameOrEmail: string) {
    if (!confirm(`Remove member '${nameOrEmail}' from this lab workspace?`)) return;
    try {
      const res = await removeStockMember(labId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showSuccess(res.message || "Member removed from lab");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    }
  }

  // Flatten locations
  const flatLocations: StockLocation[] = [];
  function flattenLocs(locs: StockLocation[], depth = 0) {
    for (const l of locs) {
      flatLocations.push({ ...l, name: "  ".repeat(depth) + l.name });
      if (l.children?.length) flattenLocs(l.children, depth + 1);
    }
  }
  flattenLocs(locations);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Stock & Inventory Configuration</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage thresholds, storage locations, taxonomy tags, and member access permissions for {activeLab.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-700">
            <span className="text-slate-400 font-normal">Categories:</span> {categories.length}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-700">
            <span className="text-slate-400 font-normal">Locations:</span> {locations.length}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-700">
            <span className="text-slate-400 font-normal">Tags:</span> {tags.length}
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {success && (
        <div className="rounded-xl border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-sm flex items-center justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-semibold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Thresholds & Locations */}
        <div className="space-y-8">
          {/* Thresholds */}
          <Section
            title="Alert Thresholds"
            sub="Set quantity and expiry limits for automated warnings"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          >
            <form onSubmit={saveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Low Stock Threshold (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={lowThreshold}
                    onChange={(e) => setLowThreshold(parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Trigger LOW_STOCK badge when count falls below this</p>
                </div>
                <div>
                  <label className={labelCls}>Near Expiry Window (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={nearExpiry}
                    onChange={(e) => setNearExpiry(parseInt(e.target.value) || 1)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Trigger EXPIRING_SOON warning within these days</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {savingSettings ? "Saving..." : "Save Thresholds"}
                </button>
              </div>
            </form>
          </Section>

          {/* Locations */}
          <Section
            title="Storage Locations"
            sub="Define physical rooms, fridges, freezers, and shelves"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Location name (e.g., Fridge B, Shelf 2)..."
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  className={inputCls}
                />
                <select
                  value={newLocParent}
                  onChange={(e) => setNewLocParent(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  <option value="">Top Level (No Parent)</option>
                  {flatLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addLocation}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Add
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 max-h-64 overflow-y-auto">
                {locations.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">No custom locations added yet.</p>
                ) : (
                  locations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{loc.name}</span>
                        {loc.parent && <span className="ml-2 text-slate-400">(in {loc.parent.name})</span>}
                      </div>
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Delete location"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Right Column: Categories & Tags */}
        <div className="space-y-8">
          {/* Categories */}
          <Section
            title="Categories"
            sub="Group items by type (Reagents, Media, Antibodies, etc.)"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400">No categories created yet.</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <span>{cat.name}</span>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Delete category"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>

          {/* Tags */}
          <Section
            title="Taxonomy Tags"
            sub="Custom labels for filtering and organizing stock"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New tag name (e.g., #urgent, #toxic)..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {tags.length === 0 ? (
                  <p className="text-xs text-slate-400">No custom tags created yet.</p>
                ) : (
                  tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <span>#{tag.name}</span>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Delete tag"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Full-width Section: Team Members & Permissions */}
      <Section
        title="Team Workspace Access & Granular Permissions"
        sub="Manage member permissions for stock operations in this lab workspace"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </button>
        }
      >
        <div className="space-y-6">
          {/* Members Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  {PERMISSION_LABELS.map((p) => (
                    <th key={p.key} className="px-3 py-3 text-center" title={p.desc}>
                      {p.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{m.user.name}</p>
                      <p className="text-[11px] text-slate-400">{m.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                        {m.role}
                      </span>
                    </td>
                    {PERMISSION_LABELS.map((p) => {
                      const val = Boolean(m[p.key]);
                      return (
                        <td key={p.key} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={val}
                            disabled={m.role === "ADMIN"}
                            onChange={() => togglePermission(m.id, p.key, val)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-40 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      {m.role !== "ADMIN" && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.user.name || m.user.email)}
                          className="text-slate-400 hover:text-red-600 font-medium text-[11px] transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invitations */}
          {invites.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Invitations ({invites.length})
              </h4>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{inv.inviteeEmail}</p>
                      <p className="text-[11px] text-slate-500">
                        Invited as <span className="font-semibold">{inv.role}</span> · Status: <span className="font-bold uppercase text-amber-700">{inv.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyInviteLink(inv.token)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleResendInvite(inv.id)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Invite Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">Invite Lab Workspace Member</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <form onSubmit={handleAddMemberByEmail} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>User Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@institution.edu"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Workspace Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "MEMBER" | "ADMIN")}
                  className={inputCls}
                >
                  <option value="MEMBER">Member (Custom Permissions)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>

              {addRole === "MEMBER" && (
                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Assign Default Permissions</p>
                  {PERMISSION_LABELS.map((p) => (
                    <label key={p.key} className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="font-medium text-slate-700">{p.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(addPerms[p.key])}
                        onChange={(e) => setAddPerms({ ...addPerms, [p.key]: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {addingMember ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
