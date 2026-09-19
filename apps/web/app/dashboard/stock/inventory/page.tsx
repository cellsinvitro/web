"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockInit,
  fetchStockItems,
  fetchStockCategories,
  fetchStockLocationsFlat,
  fetchStockTags,
  createStockItem,
  updateStockItem,
  archiveStockItem,
  issueStock,
  restockItem,
  stockoutItem,
  type StockItem,
  type StockPermissions,
  type StockCategory,
  type StockLocation,
  type StockTag,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPaise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STORAGE_LABELS: Record<string, string> = {
  AMBIENT: "Ambient",
  FRIDGE_2_8: "2–8°C",
  FREEZER_MINUS_20: "−20°C",
  DEEP_FREEZER_MINUS_80: "−80°C",
};

const STOCKOUT_REASONS = ["Expired", "Damaged", "Contaminated", "Missing", "Disposed", "Transferred", "Other"];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    IN_STOCK:      { label: "In Stock",      cls: "bg-slate-50 text-slate-700 border-slate-200" },
    LOW_STOCK:     { label: "Low Stock",     cls: "bg-amber-50  text-amber-700  border-amber-200"  },
    OUT_OF_STOCK:  { label: "Out of Stock",  cls: "bg-red-50    text-red-700    border-red-200"    },
    EXPIRED:       { label: "Expired",       cls: "bg-red-100   text-red-800    border-red-300"    },
    EXPIRING_SOON: { label: "Expiring Soon", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const { label, cls } = cfg[status ?? ""] ?? { label: "Unknown", cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Add / Edit Stock Modal ───────────────────────────────────────────────────

type StockFormData = {
  name: string; casNo: string; make: string; catalogueNo: string; packSize: string;
  priceRupees: string; initialQty: string; expiryDate: string;
  categoryId: string; hazardStatus: string; storageTemperature: string;
  locationId: string; remarks: string; tagIds: string[];
};

const emptyForm: StockFormData = {
  name: "", casNo: "", make: "", catalogueNo: "", packSize: "",
  priceRupees: "", initialQty: "0", expiryDate: "",
  categoryId: "", hazardStatus: "NON_HAZARDOUS", storageTemperature: "AMBIENT",
  locationId: "", remarks: "", tagIds: [],
};

function itemToForm(item: StockItem): StockFormData {
  return {
    name: item.name, casNo: item.casNo ?? "", make: item.make ?? "",
    catalogueNo: item.catalogueNo ?? "", packSize: item.packSize ?? "",
    priceRupees: String(item.pricePaise / 100), initialQty: String(item.currentQty),
    expiryDate: item.expiryDate ? (item.expiryDate.split("T")[0] ?? "") : "",
    categoryId: item.categoryId ?? "", hazardStatus: item.hazardStatus,
    storageTemperature: item.storageTemperature, locationId: item.locationId ?? "",
    remarks: item.remarks ?? "",
    tagIds: (item.tags ?? []).map((t) => t.tag.id),
  };
}

function AddEditModal({
  labId, item, categories, locations, tags, onClose, onSaved,
}: {
  labId: string;
  item: StockItem | null;
  categories: StockCategory[];
  locations: StockLocation[];
  tags: StockTag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StockFormData>(item ? itemToForm(item) : emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof StockFormData, v: string | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (id: string) =>
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Item name is required"); return; }
    const pricePaise = Math.round(parseFloat(form.priceRupees || "0") * 100);
    if (isNaN(pricePaise) || pricePaise < 0) { setError("Invalid price"); return; }

    setSubmitting(true);
    setError(null);
    try {
      if (item) {
        await updateStockItem(labId, item.id, {
          name: form.name, casNo: form.casNo, make: form.make,
          catalogueNo: form.catalogueNo, packSize: form.packSize,
          pricePaise,
          expiryDate: form.expiryDate || undefined,
          categoryId: form.categoryId || undefined,
          hazardStatus: form.hazardStatus,
          storageTemperature: form.storageTemperature,
          locationId: form.locationId || undefined,
          remarks: form.remarks,
          tagIds: form.tagIds,
        });
      } else {
        const qty = parseInt(form.initialQty || "0");
        await createStockItem(labId, {
          name: form.name, casNo: form.casNo, make: form.make,
          catalogueNo: form.catalogueNo, packSize: form.packSize,
          pricePaise, initialQty: isNaN(qty) ? 0 : qty,
          expiryDate: form.expiryDate || undefined,
          categoryId: form.categoryId || undefined,
          hazardStatus: form.hazardStatus,
          storageTemperature: form.storageTemperature,
          locationId: form.locationId || undefined,
          remarks: form.remarks,
          tagIds: form.tagIds,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-dvh w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">{item ? "Edit Stock Item" : "Add Stock Item"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form id="stock-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Basic Information */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Item Name *</label>
                  <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. DMEM, PCR Master Mix…" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>CAS Number</label>
                    <input className={inputCls} value={form.casNo} onChange={(e) => set("casNo", e.target.value)} placeholder="e.g. 7732-18-5" />
                  </div>
                  <div>
                    <label className={labelCls}>Manufacturer / Make</label>
                    <input className={inputCls} value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="e.g. Sigma-Aldrich" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Catalogue No.</label>
                    <input className={inputCls} value={form.catalogueNo} onChange={(e) => set("catalogueNo", e.target.value)} placeholder="e.g. D8537" />
                  </div>
                  <div>
                    <label className={labelCls}>Pack Size</label>
                    <input className={inputCls} value={form.packSize} onChange={(e) => set("packSize", e.target.value)} placeholder="e.g. 500 mL, 100 tubes" />
                  </div>
                </div>
              </div>
            </section>

            {/* Purchase Information */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price (₹)</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.priceRupees} onChange={(e) => set("priceRupees", e.target.value)} placeholder="0.00" />
                </div>
                {!item && (
                  <div>
                    <label className={labelCls}>Initial Quantity</label>
                    <input type="number" min="0" className={inputCls} value={form.initialQty} onChange={(e) => set("initialQty", e.target.value)} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
                </div>
              </div>
            </section>

            {/* Classification */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Classification</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Item Type</label>
                    <select className={inputCls} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                      <option value="">— Select category —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Hazard</label>
                    <select className={inputCls} value={form.hazardStatus} onChange={(e) => set("hazardStatus", e.target.value)}>
                      <option value="NON_HAZARDOUS">Non-Hazardous</option>
                      <option value="HAZARDOUS">Hazardous</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Storage Temperature</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { v: "AMBIENT", l: "Ambient" },
                      { v: "FRIDGE_2_8", l: "2–8°C" },
                      { v: "FREEZER_MINUS_20", l: "−20°C" },
                      { v: "DEEP_FREEZER_MINUS_80", l: "−80°C" },
                    ].map(({ v, l }) => (
                      <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${form.storageTemperature === v ? "border-slate-800 bg-slate-50 text-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        <input type="radio" name="storage" value={v} checked={form.storageTemperature === v} onChange={(e) => set("storageTemperature", e.target.value)} className="sr-only" />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Experimental Use */}
            {tags.length > 0 && (
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Experimental Use</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${form.tagIds.includes(tag.id) ? "border-slate-800 bg-slate-50 text-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {form.tagIds.includes(tag.id) ? "✓ " : ""}{tag.name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Storage Location */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Storage Location</h3>
              <div>
                <label className={labelCls}>Location</label>
                <select className={inputCls} value={form.locationId} onChange={(e) => set("locationId", e.target.value)}>
                  <option value="">— Select location —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.parent ? `${loc.parent.name} › ` : ""}{loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Remarks */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Additional</h3>
              <div>
                <label className={labelCls}>Remarks</label>
                <textarea rows={2} className={inputCls} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any additional notes…" />
              </div>
            </section>
          </div>
        </form>

        {error && (
          <div className="mx-6 mb-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="submit" form="stock-item-form" disabled={submitting} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Saving…" : item ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Issue Modal ────────────────────────────────────────────────────────

function IssueModal({ labId, item, onClose, onDone }: { labId: string; item: StockItem; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (qty <= 0 || qty > item.currentQty) { setError("Invalid quantity"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await issueStock(labId, { items: [{ itemId: item.id, quantity: qty }], purpose, remarks });
      onDone();
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to issue"); }
    finally { setSubmitting(false); }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Issue Stock</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleIssue} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">Available: {item.currentQty} unit(s)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Quantity to Issue</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">−</button>
              <input type="number" min={1} max={item.currentQty} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="h-10 w-20 rounded-xl border border-slate-200 text-center text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none" />
              <button type="button" onClick={() => setQty(Math.min(item.currentQty, qty + 1))} className="h-10 w-10 rounded-xl border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Purpose / Experiment</label>
            <input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. DNA Extraction, PCR setup…" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Remarks</label>
            <input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {submitting ? "Issuing…" : "Confirm Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Restock Modal ────────────────────────────────────────────────────────────

function RestockModal({ labId, item, onClose, onDone }: { labId: string; item: StockItem; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (qty <= 0) { setError("Quantity must be > 0"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await restockItem(labId, { itemId: item.id, quantity: qty, remarks });
      onDone(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Restock</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handle} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">Current stock: {item.currentQty} unit(s)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Quantity to Add</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Remarks</label>
            <input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Purchased from Sigma-Aldrich" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "Restocking…" : `+${qty} units`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Stockout Modal ───────────────────────────────────────────────────────────

function StockoutModal({ labId, item, onClose, onDone }: { labId: string; item: StockItem; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) { setError("Reason is required"); return; }
    if (qty <= 0 || qty > item.currentQty) { setError("Invalid quantity"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await stockoutItem(labId, { itemId: item.id, quantity: qty, reason, remarks });
      onDone(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Stockout / Removal</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handle} className="p-6 space-y-4">
          <div className="rounded-xl bg-red-50 px-4 py-3 border border-red-100">
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">Available: {item.currentQty} unit(s)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Quantity to Remove</label>
            <input type="number" min={1} max={item.currentQty} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Reason *</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} required>
              <option value="">— Select reason —</option>
              {STOCKOUT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Remarks</label>
            <input className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Details…" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {submitting ? "Removing…" : "Confirm Stockout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────

function InventoryContent() {
  const { activeLab } = useLabWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [permissions, setPermissions] = useState<StockPermissions | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [tags, setTags] = useState<StockTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterHazard, setFilterHazard] = useState("");
  const [filterStorage, setFilterStorage] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterExpiry, setFilterExpiry] = useState(searchParams.get("expiryStatus") ?? "");
  const [filterAvail, setFilterAvail] = useState(searchParams.get("availability") ?? "");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // Modals
  const [showAdd, setShowAdd] = useState(searchParams.get("showAdd") === "1");
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [issueItem, setIssueItem] = useState<StockItem | null>(null);
  const [restockItem_, setRestockItem] = useState<StockItem | null>(null);
  const [stockoutItem_, setStockoutItem] = useState<StockItem | null>(null);

  const loadMeta = useCallback(async (labId: string) => {
    const [initRes, catRes, locRes, tagRes] = await Promise.all([
      fetchStockInit(labId),
      fetchStockCategories(labId),
      fetchStockLocationsFlat(labId),
      fetchStockTags(labId),
    ]);
    setPermissions(initRes.permissions);
    setCategories(catRes.categories);
    setLocations(locRes.locations);
    setTags(tagRes.tags);
  }, []);

  const loadItems = useCallback(async (labId: string) => {
    try {
      const res = await fetchStockItems(labId, {
        search, categoryId: filterCategory, hazard: filterHazard,
        storage: filterStorage, locationId: filterLocation,
        expiryStatus: filterExpiry, availability: filterAvail,
        sortBy, sortDir, page, limit: 50,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items");
    }
  }, [search, filterCategory, filterHazard, filterStorage, filterLocation, filterExpiry, filterAvail, sortBy, sortDir, page]);

  useEffect(() => {
    if (!activeLab) return;
    setLoading(true);
    setError(null);
    Promise.all([loadMeta(activeLab.id), loadItems(activeLab.id)])
      .finally(() => setLoading(false));
  }, [activeLab?.id, loadMeta, loadItems]);

  if (!activeLab) return (
    <div className="py-16 text-center text-sm text-slate-500">No lab workspace. <Link href="/dashboard/logbook" className="text-slate-900 underline">Set one up</Link></div>
  );

  const labId = activeLab.id;

  const refreshItems = () => loadItems(labId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            placeholder="Search by name, CAS, catalogue, manufacturer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        {permissions?.canAddStock && (
          <button
            id="add-stock-btn"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Stock
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none">
          <option value="">All Types</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterHazard} onChange={(e) => { setFilterHazard(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none">
          <option value="">All Hazard</option>
          <option value="HAZARDOUS">Hazardous</option>
          <option value="NON_HAZARDOUS">Non-Hazardous</option>
        </select>
        <select value={filterStorage} onChange={(e) => { setFilterStorage(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none">
          <option value="">All Storage</option>
          <option value="AMBIENT">Ambient</option>
          <option value="FRIDGE_2_8">2–8°C</option>
          <option value="FREEZER_MINUS_20">−20°C</option>
          <option value="DEEP_FREEZER_MINUS_80">−80°C</option>
        </select>
        <select value={filterExpiry} onChange={(e) => { setFilterExpiry(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none">
          <option value="">All Expiry</option>
          <option value="EXPIRED">Expired</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="VALID">Valid</option>
        </select>
        <select value={filterAvail} onChange={(e) => { setFilterAvail(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none">
          <option value="">All Availability</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
        {(filterCategory || filterHazard || filterStorage || filterExpiry || filterAvail || search) && (
          <button onClick={() => { setFilterCategory(""); setFilterHazard(""); setFilterStorage(""); setFilterExpiry(""); setFilterAvail(""); setSearch(""); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50">
            Clear filters
          </button>
        )}
        <div className="ml-auto text-xs text-slate-500 self-center">{total} item{total !== 1 ? "s" : ""}</div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-400">No stock items found.</p>
          {permissions?.canAddStock && (
            <button onClick={() => setShowAdd(true)} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add first item</button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  { key: "name", label: "Item" },
                  { key: null, label: "CAS No." },
                  { key: null, label: "Make" },
                  { key: null, label: "Pack" },
                  { key: "expiryDate", label: "Expiry" },
                  { key: "pricePaise", label: "Price" },
                  { key: "currentQty", label: "Qty" },
                  { key: null, label: "Value" },
                  { key: null, label: "Storage" },
                  { key: null, label: "Status" },
                  { key: null, label: "Actions" },
                ].map((col) => (
                  <th key={col.label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {col.key ? (
                      <button
                        onClick={() => {
                          if (sortBy === col.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                          else { setSortBy(col.key!); setSortDir("asc"); }
                        }}
                        className="flex items-center gap-1 hover:text-slate-800"
                      >
                        {col.label}
                        {sortBy === col.key && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/stock/inventory/${item.id}`} className="font-medium text-slate-800 hover:text-slate-700">
                      {item.name}
                    </Link>
                    {item.category && <p className="text-xs text-slate-400">{item.category.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.casNo ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.make ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.packSize ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(item.expiryDate)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{formatPaise(item.pricePaise)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.currentQty}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{formatPaise(item.stockValuePaise ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {STORAGE_LABELS[item.storageTemperature] ?? item.storageTemperature}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/stock/inventory/${item.id}`} title="View" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      </Link>
                      {permissions?.canEditStock && (
                        <button onClick={() => setEditItem(item)} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                        </button>
                      )}
                      {permissions?.canIssueStock && item.currentQty > 0 && (
                        <button onClick={() => setIssueItem(item)} title="Issue" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        </button>
                      )}
                      {permissions?.canRestockStock && (
                        <button onClick={() => setRestockItem(item)} title="Restock" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        </button>
                      )}
                      {permissions?.canRestockStock && (
                        <button onClick={() => setStockoutItem(item)} title="Stockout" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
          <span className="text-xs text-slate-500">Page {page} of {Math.ceil(total / 50)}</span>
          <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Modals */}
      {(showAdd || editItem) && (
        <AddEditModal
          labId={labId} item={editItem}
          categories={categories} locations={locations} tags={tags}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={refreshItems}
        />
      )}
      {issueItem && <IssueModal labId={labId} item={issueItem} onClose={() => setIssueItem(null)} onDone={refreshItems} />}
      {restockItem_ && <RestockModal labId={labId} item={restockItem_} onClose={() => setRestockItem(null)} onDone={refreshItems} />}
      {stockoutItem_ && <StockoutModal labId={labId} item={stockoutItem_} onClose={() => setStockoutItem(null)} onDone={refreshItems} />}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-slate-100" />}>
      <InventoryContent />
    </Suspense>
  );
}
