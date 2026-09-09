"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminToolSettings,
  updateAdminToolSetting,
  type ToolKey,
  type ToolSetting,
} from "@/lib/api";

const labels: Record<ToolKey, { title: string; description: string }> = {
  chatbot: { title: "BioChem AI Assistant", description: "Questions sent to the Chemistry and Biology assistant." },
  molarity: { title: "Molarity calculator", description: "Molarity, mass, and dilution calculations." },
  ic50: { title: "IC50 calculator", description: "Dose-response and IC50 curve fitting." },
};

export default function AdminToolsPage() {
  const [settings, setSettings] = useState<ToolSetting[]>([]);
  const [values, setValues] = useState<Record<ToolKey, string>>({ chatbot: "", molarity: "", ic50: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ToolKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminToolSettings()
      .then((data) => {
        setSettings(data);
        setValues({
          chatbot: data.find((item) => item.toolKey === "chatbot")?.usageLimit?.toString() ?? "",
          molarity: data.find((item) => item.toolKey === "molarity")?.usageLimit?.toString() ?? "",
          ic50: data.find((item) => item.toolKey === "ic50")?.usageLimit?.toString() ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load tool settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async (toolKey: ToolKey) => {
    const value = values[toolKey].trim();
    if (value && (!/^\d+$/.test(value) || Number(value) < 0)) {
      setError("Enter a whole number, or leave the field blank for unlimited use.");
      return;
    }
    setSaving(toolKey);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateAdminToolSetting(toolKey, value ? Number(value) : null);
      setSettings((current) => current.map((item) => item.toolKey === toolKey ? updated : item));
      setMessage(`${labels[toolKey].title} limit saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save tool limit");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Admin · access</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Tool usage limits</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Set how many times each tool can be used by one user. Blank means unlimited. You can edit a limit anytime; changing it does not reset previous usage.</p>
      </header>
      {loading ? <p className="text-sm text-slate-500">Loading settings...</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {settings.map((setting) => {
          const tool = labels[setting.toolKey];
          return (
            <section key={setting.toolKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">{tool.title}</h2>
              <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{tool.description}</p>
              <label className="mt-5 block text-sm font-medium text-slate-700">
                Uses per user
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={values[setting.toolKey]}
                  onChange={(event) => setValues((current) => ({ ...current, [setting.toolKey]: event.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-400"
                />
              </label>
              <button type="button" onClick={() => save(setting.toolKey)} disabled={saving === setting.toolKey} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {saving === setting.toolKey ? "Saving..." : "Save limit"}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
