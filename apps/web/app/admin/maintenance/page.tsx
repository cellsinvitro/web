"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminMaintenanceRule,
  fetchAdminMaintenanceRules,
  saveAdminMaintenanceRule,
  updateAdminMaintenanceRule,
  type MaintenanceRule,
  type MaintenanceScope,
} from "@/lib/api";
import { useConfirm } from "@/context/ConfirmContext";
import { AdminSpinner } from "@/components/AdminLoader";

const emptyForm = { targetPath: "", scope: "WEB_PATH" as MaintenanceScope, enabled: true, message: "" };

export default function AdminMaintenancePage() {
  const confirm = useConfirm();
  const [rules, setRules] = useState<MaintenanceRule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await fetchAdminMaintenanceRules());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = { ...form, targetPath: form.targetPath.trim(), message: form.message.trim() };
      const rule = editingId
        ? await updateAdminMaintenanceRule(editingId, input)
        : await saveAdminMaintenanceRule(input);
      setRules((current) => editingId
        ? current.map((item) => item.id === rule.id ? rule : item)
        : [rule, ...current.filter((item) => item.id !== rule.id)]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save maintenance rule");
    } finally {
      setSaving(false);
    }
  };

  const edit = (rule: MaintenanceRule) => {
    setEditingId(rule.id);
    setForm({ targetPath: rule.targetPath, scope: rule.scope, enabled: rule.enabled, message: rule.message || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (rule: MaintenanceRule) => {
    setPendingId(rule.id);
    try {
      const updated = await updateAdminMaintenanceRule(rule.id, {
        targetPath: rule.targetPath,
        scope: rule.scope,
        enabled: !rule.enabled,
        message: rule.message || "",
      });
      setRules((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (rule: MaintenanceRule) => {
    if (!await confirm({ title: "Delete maintenance rule", message: `Remove maintenance for ${rule.targetPath}?`, confirmLabel: "Delete rule", variant: "danger" })) return;
    setPendingId(rule.id);
    try {
      await deleteAdminMaintenanceRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Maintenance</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Temporarily pause website pages or API endpoints without a deployment. Child paths are included automatically.</p>
      </div>

      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit rule" : "Add a maintenance rule"}</h2>
            <p className="mt-1 text-sm text-slate-500">Paste a full URL or enter a path such as <span className="font-medium text-slate-700">/courses</span>.</p>
          </div>
          {editingId ? <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-500 hover:text-slate-950">Cancel</button> : null}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Website link or path</span><input required value={form.targetPath} onChange={(event) => setForm({ ...form, targetPath: event.target.value })} placeholder="https://example.com/courses" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Applies to</span><select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as MaintenanceScope })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"><option value="WEB_PATH">Website page</option><option value="API_PATH">API endpoint</option></select></label>
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Message <span className="font-normal text-slate-400">(optional)</span></span><textarea rows={2} maxLength={500} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="This area is temporarily unavailable. Please try again soon." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" /></label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} className="h-4 w-4 rounded border-slate-300" />Enable immediately</label>
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save changes" : "Put under maintenance"}</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Configured rules</h2></div>
        {loading ? <div className="flex flex-col items-center gap-3 px-4 py-12"><AdminSpinner size={36} /><span className="text-xs text-slate-400">Loading rules...</span></div> : rules.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">No maintenance rules configured.</p> : <div className="divide-y divide-slate-100">{rules.map((rule) => <div key={rule.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${rule.enabled ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{rule.enabled ? "Active" : "Disabled"}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{rule.scope === "WEB_PATH" ? "Website" : "API"}</span></div><p className="mt-2 truncate font-medium text-slate-950">{rule.targetPath}</p>{rule.message ? <p className="mt-1 truncate text-sm text-slate-500">{rule.message}</p> : null}</div><div className="flex shrink-0 gap-2"><button type="button" disabled={pendingId === rule.id} onClick={() => toggle(rule)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{rule.enabled ? "Disable" : "Enable"}</button><button type="button" onClick={() => edit(rule)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button><button type="button" disabled={pendingId === rule.id} onClick={() => remove(rule)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button></div></div>)}</div>}
      </section>
    </div>
  );
}