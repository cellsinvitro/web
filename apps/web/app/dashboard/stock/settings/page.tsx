"use client";

import { useEffect, useState, useCallback } from "react";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockInit,
  fetchStockSettings, updateStockSettings,
  fetchStockCategories, createStockCategory, updateStockCategory, deleteStockCategory,
  fetchStockTags, createStockTag, updateStockTag, deleteStockTag,
  fetchStockLocations, createStockLocation, deleteStockLocation,
  fetchStockMembers, updateMemberStockPermissions,
  type StockSettings,
  type StockCategory,
  type StockTag,
  type StockLocation,
  type StockPermissions,
} from "@/lib/api";

const PERMISSION_LABELS: Array<{ key: keyof StockPermissions; label: string; desc: string }> = [
  { key: "canViewStock",           label: "View Stock",              desc: "Can see inventory and dashboard" },
  { key: "canAddStock",            label: "Add Stock Items",         desc: "Can create new stock records" },
  { key: "canEditStock",           label: "Edit Stock Details",      desc: "Can edit item metadata" },
  { key: "canIssueStock",          label: "Issue Stock",             desc: "Can issue items for lab use" },
  { key: "canRestockStock",        label: "Restock / Stockout",      desc: "Can receive stock and record losses" },
  { key: "canManageStockSettings", label: "Manage Settings",         desc: "Can manage locations, categories, tags, permissions" },
];

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 pb-4 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
      {children}
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

  // Inline add form state
  const [newCat, setNewCat] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newLoc, setNewLoc] = useState("");
  const [newLocParent, setNewLocParent] = useState("");

  // Settings form
  const [lowThreshold, setLowThreshold] = useState(5);
  const [nearExpiry, setNearExpiry] = useState(90);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
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

  if (!activeLab) return (
    <div className="py-16 text-center text-sm text-slate-500">No lab workspace selected.</div>
  );

  const labId = activeLab.id;

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );

  if (!permissions?.canManageStockSettings) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm text-amber-800">You do not have permission to manage stock settings.</p>
    </div>
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateStockSettings(labId, { lowStockThreshold: lowThreshold, nearExpiryDays: nearExpiry });
      setSettings(updated);
      showSuccess("Settings saved");
    } catch { setError("Failed to save settings"); }
    finally { setSavingSettings(false); }
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    try {
      const cat = await createStockCategory(labId, { name: newCat.trim() });
      setCategories((prev) => [...prev, cat]);
      setNewCat("");
      showSuccess("Category added");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Items using it will become uncategorised.")) return;
    try {
      await deleteStockCategory(labId, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showSuccess("Category deleted");
    } catch (e) { setError(e instanceof Error ? e.message : "Cannot delete — items may be using it"); }
  }

  async function addTag() {
    if (!newTag.trim()) return;
    try {
      const tag = await createStockTag(labId, { name: newTag.trim() });
      setTags((prev) => [...prev, tag]);
      setNewTag("");
      showSuccess("Tag added");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function deleteTag(id: string) {
    if (!confirm("Delete this tag?")) return;
    try {
      await deleteStockTag(labId, id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      showSuccess("Tag deleted");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function addLocation() {
    if (!newLoc.trim()) return;
    try {
      const loc = await createStockLocation(labId, { name: newLoc.trim(), parentId: newLocParent || undefined });
      setLocations((prev) => [...prev, loc]);
      setNewLoc("");
      setNewLocParent("");
      showSuccess("Location added");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function deleteLocation(id: string) {
    if (!confirm("Delete this location?")) return;
    try {
      await deleteStockLocation(labId, id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      showSuccess("Location deleted");
    } catch (e) { setError(e instanceof Error ? e.message : "Cannot delete — items may be using it"); }
  }

  async function togglePermission(memberId: string, key: keyof StockPermissions, current: boolean) {
    try {
      await updateMemberStockPermissions(labId, memberId, { [key]: !current });
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, [key]: !current } : m)
      );
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  // Flatten location tree for parent dropdown
  const flatLocations: StockLocation[] = [];
  function flattenLocs(locs: StockLocation[], depth = 0) {
    for (const l of locs) {
      flatLocations.push({ ...l, name: "  ".repeat(depth) + l.name });
      if (l.children?.length) flattenLocs(l.children, depth + 1);
    }
  }
  flattenLocs(locations);

  return (
    <div className="max-w-3xl space-y-6">
      {success && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Thresholds */}
      <Section title="Thresholds" sub="Control when alerts and badges trigger">
        <form onSubmit={saveSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Low Stock Threshold (units)</label>
              <input type="number" min={0} value={lowThreshold} onChange={(e) => setLowThreshold(parseInt(e.target.value) || 0)} className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">Items at or below this quantity show as Low Stock</p>
            </div>
            <div>
              <label className={labelCls}>Near Expiry Days</label>
              <input type="number" min={1} value={nearExpiry} onChange={(e) => setNearExpiry(parseInt(e.target.value) || 90)} className={inputCls} />
              <p className="mt-1 text-xs text-slate-400">Items expiring within this many days are flagged</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingSettings} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {savingSettings ? "Saving…" : "Save Thresholds"}
            </button>
          </div>
        </form>
      </Section>

      {/* Categories */}
      <Section title="Item Categories" sub="Types of stock items — seeded by default, you can add more">
        <div className="space-y-2 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
              <div>
                <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                {cat.isDefault && <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-500">Default</span>}
              </div>
              {!cat.isDefault && (
                <button onClick={() => deleteCategory(cat.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} placeholder="New category name…" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())} />
          <button onClick={addCategory} disabled={!newCat.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">Add</button>
        </div>
      </Section>

      {/* Tags */}
      <Section title="Experimental Use Tags" sub="Label items by experimental context">
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-2 py-1.5">
              <span className="text-xs font-medium text-slate-700">{tag.name}</span>
              {!tag.isDefault && (
                <button onClick={() => deleteTag(tag.id)} className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} placeholder="New tag name…" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
          <button onClick={addTag} disabled={!newTag.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">Add</button>
        </div>
      </Section>

      {/* Locations */}
      <Section title="Storage Locations" sub="Hierarchical lab locations for stock placement">
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div key={loc.id}>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{loc.name}</span>
                  {loc.isDefault && <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-500">Default</span>}
                </div>
                {!loc.isDefault && (
                  <button onClick={() => deleteLocation(loc.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                )}
              </div>
              {loc.children && loc.children.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {loc.children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2">
                      <span className="text-sm text-slate-600">↳ {child.name}</span>
                      {!child.isDefault && (
                        <button onClick={() => deleteLocation(child.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select className={`${inputCls} w-44 shrink-0`} value={newLocParent} onChange={(e) => setNewLocParent(e.target.value)}>
            <option value="">Root level</option>
            {flatLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input className={`${inputCls} flex-1`} placeholder="New location name…" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())} />
          <button onClick={addLocation} disabled={!newLoc.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">Add</button>
        </div>
      </Section>

      {/* Member Permissions */}
      {members.length > 0 && (
        <Section title="Member Permissions" sub="Control each member's stock access. Owners and Admins always have full access.">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Member</th>
                  {PERMISSION_LABELS.map((p) => (
                    <th key={p.key} className="pb-3 px-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap" title={p.desc}>
                      {p.label.replace(" ", "\n")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((member) => {
                  const isPrivileged = member.role === "OWNER" || member.role === "ADMIN";
                  return (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          {member.user.avatarUrl ? (
                            <img src={member.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                              {member.user.name?.charAt(0).toUpperCase() ?? "?"}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{member.user.name ?? "Unknown"}</p>
                            <p className="text-xs text-slate-400">{member.role}</p>
                          </div>
                        </div>
                      </td>
                      {PERMISSION_LABELS.map((p) => {
                        const enabled = isPrivileged || member[p.key as keyof typeof member] as boolean;
                        return (
                          <td key={p.key} className="py-3 px-2 text-center">
                            <button
                              disabled={isPrivileged}
                              onClick={() => !isPrivileged && togglePermission(member.id, p.key, member[p.key as keyof typeof member] as boolean)}
                              title={isPrivileged ? "OWNER/ADMIN always has full access" : p.desc}
                              className={`mx-auto flex h-6 w-11 items-center rounded-full border transition-colors ${
                                enabled ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-slate-100"
                              } ${isPrivileged ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} />
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
      )}
    </div>
  );
}
