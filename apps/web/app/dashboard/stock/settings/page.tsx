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
  addStockMemberByEmail,
  type StockSettings,
  type StockCategory,
  type StockTag,
  type StockLocation,
  type StockPermissions,
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

export default function StockSettingsPage() {
  const { activeLab } = useLabWorkspace();
  const [permissions, setPermissions] = useState<StockPermissions | null>(null);
  const [settings, setSettings] = useState<StockSettings | null>(null);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [tags, setTags] = useState<StockTag[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof fetchStockMembers>>["members"]>([]);
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
      const [initRes, settingsRes, catRes, tagRes, locRes, membersRes] = await Promise.all([
        fetchStockInit(labId),
        fetchStockSettings(labId),
        fetchStockCategories(labId),
        fetchStockTags(labId),
        fetchStockLocations(labId),
        fetchStockMembers(labId),
      ]);
      setPermissions(initRes.permissions);
      setSettings(settingsRes);
      setLowThreshold(settingsRes.lowStockThreshold);
      setNearExpiry(settingsRes.nearExpiryDays);
      setCategories(catRes.categories);
      setTags(tagRes.tags);
      setLocations(locRes.locations);
      setMembers(membersRes.members);
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

      if (res.added && res.member) {
        setMembers((prev) => [...prev, res.member!]);
        showSuccess(res.message || "Member added to lab");
      } else if (res.invited) {
        showSuccess(res.message || "Invitation sent to member");
      }

      setShowAddModal(false);
      setAddEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setAddingMember(false);
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
            <form onSubmit={saveSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Low Stock Threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={lowThreshold}
                      onChange={(e) => setLowThreshold(parseInt(e.target.value) || 0)}
                      className={inputCls}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">units</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Items at or below this count show a Low Stock badge.</p>
                </div>
                <div>
                  <label className={labelCls}>Near Expiry Window</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      value={nearExpiry}
                      onChange={(e) => setNearExpiry(parseInt(e.target.value) || 90)}
                      className={inputCls}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">days</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Items expiring within this timeframe are flagged.</p>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {savingSettings ? "Saving…" : "Save Thresholds"}
                </button>
              </div>
            </form>
          </Section>

          {/* Storage Locations */}
          <Section
            title="Storage Locations"
            sub="Hierarchical lab areas, fridges, freezers, and shelves"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          >
            <div className="space-y-3 mb-6 max-h-[320px] overflow-y-auto pr-1">
              {locations.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No storage locations configured yet.</p>
              ) : (
                locations.map((loc) => (
                  <div key={loc.id} className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-slate-800">{loc.name}</span>
                        {loc.isDefault && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Default</span>
                        )}
                      </div>
                      {!loc.isDefault && (
                        <button
                          onClick={() => deleteLocation(loc.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete location"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Children sub-locations */}
                    {loc.children && loc.children.length > 0 && (
                      <div className="ml-6 space-y-1.5 border-l-2 border-slate-200 pl-3">
                        {loc.children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-2 hover:bg-slate-50 transition-colors">
                            <span className="text-xs font-medium text-slate-700">↳ {child.name}</span>
                            {!child.isDefault && (
                              <button
                                onClick={() => deleteLocation(child.id)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete sub-location"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Location Form */}
            <div className="pt-4 border-t border-slate-100">
              <label className={labelCls}>Add New Storage Location</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className={`${inputCls} sm:w-44 shrink-0`}
                  value={newLocParent}
                  onChange={(e) => setNewLocParent(e.target.value)}
                >
                  <option value="">Root level</option>
                  {flatLocations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Location name (e.g. Shelf B3, Freezer 1)..."
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                />
                <button
                  onClick={addLocation}
                  disabled={!newLoc.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 shrink-0 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* Right Column: Categories & Tags */}
        <div className="space-y-8">
          {/* Categories */}
          <Section
            title="Item Categories"
            sub="System categories for stock organization and filtering"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 11h.01M7 15h.01M11 7h7M11 11h7M11 15h7M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
              </svg>
            }
          >
            <div className="space-y-2 mb-6 max-h-[320px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                    {cat.isDefault && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Default</span>
                    )}
                  </div>
                  {!cat.isDefault && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete category"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Category */}
            <div className="pt-4 border-t border-slate-100">
              <label className={labelCls}>Add New Category</label>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Category name (e.g. Enzymes, Solvents)..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                />
                <button
                  onClick={addCategory}
                  disabled={!newCat.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 shrink-0 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </Section>

          {/* Tags */}
          <Section
            title="Experimental Use Tags"
            sub="Custom labels for experimental and research context"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            }
          >
            <div className="flex flex-wrap gap-2 mb-6 min-h-[80px] p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-slate-800"
                >
                  <span className="text-xs font-semibold">{tag.name}</span>
                  {!tag.isDefault && (
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remove tag"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Tag */}
            <div className="pt-4 border-t border-slate-100">
              <label className={labelCls}>Add New Tag</label>
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Tag name (e.g. Hazardous, PCR-Grade)..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 shrink-0 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Member Permissions (Full-Width Section) */}
      <Section
        title="Member Access Permissions"
        sub="Control granular stock management privileges for lab members. Lab Owners and Admins always maintain full access."
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Member</th>
                {PERMISSION_LABELS.map((p) => (
                  <th
                    key={p.key}
                    className="py-3.5 px-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                    title={p.desc}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.map((member) => {
                const isPrivileged = member.role === "OWNER" || member.role === "ADMIN";
                return (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {member.user.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm">
                            {member.user.name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.user.name ?? "Unknown"}</p>
                          <p className="text-xs text-slate-400">{member.user.email}</p>
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    {PERMISSION_LABELS.map((p) => {
                      const enabled = isPrivileged || (member[p.key as keyof typeof member] as boolean);
                      return (
                        <td key={p.key} className="py-3.5 px-3 text-center">
                          <button
                            disabled={isPrivileged}
                            onClick={() => !isPrivileged && togglePermission(member.id, p.key, member[p.key as keyof typeof member] as boolean)}
                            title={isPrivileged ? "OWNER/ADMIN always has full access" : p.desc}
                            className={`mx-auto flex h-6 w-11 items-center rounded-full border transition-colors ${
                              enabled ? "border-slate-900 bg-slate-950" : "border-slate-200 bg-slate-100"
                            } ${isPrivileged ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-slate-700"}`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                                enabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Member to Lab</h3>
                <p className="text-xs text-slate-500 mt-0.5">Invite a team member by email and customize initial stock permissions.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMemberByEmail} className="space-y-4">
              <div>
                <label className={labelCls}>Email Address</label>
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
                <label className={labelCls}>Initial Lab Role</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "MEMBER" | "ADMIN")}
                  className={inputCls}
                >
                  <option value="MEMBER">MEMBER — Standard lab member</option>
                  <option value="ADMIN">ADMIN — Full administrative access</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Initial Stock Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {PERMISSION_LABELS.map((p) => (
                    <label
                      key={p.key}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                        addPerms[p.key]
                          ? "border-slate-900 bg-slate-900/5 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={addPerms[p.key]}
                        onChange={(e) =>
                          setAddPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                      />
                      <div className="text-xs">
                        <p className="font-semibold">{p.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !addEmail.trim()}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
