"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockInit,
  fetchStockItems,
  issueStock,
  type StockItem,
  type StockPermissions,
} from "@/lib/api";

function formatPaise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

type IssueLineItem = {
  itemId: string;
  item: StockItem;
  quantity: number;
};

export default function StockIssue() {
  const { activeLab } = useLabWorkspace();
  const [permissions, setPermissions] = useState<StockPermissions | null>(null);
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [basket, setBasket] = useState<IssueLineItem[]>([]);
  const [purpose, setPurpose] = useState("");
  const [projectName, setProjectName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!activeLab) return;
    const labId = activeLab.id;
    setLoading(true);
    Promise.all([fetchStockInit(labId), fetchStockItems(labId, { limit: 100 })]).then(([init, items]) => {
      setPermissions(init.permissions);
      setAllItems(items.items.filter((i) => i.currentQty > 0));
    }).catch(() => setError("Failed to load")).finally(() => setLoading(false));
  }, [activeLab?.id]);

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      allItems.filter(
        (i) =>
          !basket.some((b) => b.itemId === i.id) &&
          (i.name.toLowerCase().includes(lower) ||
            (i.casNo ?? "").toLowerCase().includes(lower) ||
            (i.catalogueNo ?? "").toLowerCase().includes(lower))
      ).slice(0, 10)
    );
  }, [allItems, basket]);

  useEffect(() => { doSearch(search); }, [search, doSearch]);

  function addToBasket(item: StockItem) {
    setBasket((b) => [...b, { itemId: item.id, item, quantity: 1 }]);
    setSearch("");
    setSearchResults([]);
  }

  function removeFromBasket(itemId: string) {
    setBasket((b) => b.filter((x) => x.itemId !== itemId));
  }

  function setQty(itemId: string, qty: number) {
    setBasket((b) => b.map((x) => x.itemId === itemId ? { ...x, quantity: Math.max(1, Math.min(x.item.currentQty, qty)) } : x));
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLab || basket.length === 0) return;
    setSubmitting(true);
    setError(null);
    setValidationErrors([]);
    setSuccessMsg(null);
    try {
      await issueStock(activeLab.id, {
        items: basket.map((b) => ({ itemId: b.itemId, quantity: b.quantity })),
        purpose, projectName, remarks,
      });
      setSuccessMsg(`Successfully issued ${basket.length} item(s).`);
      setBasket([]);
      setPurpose("");
      setProjectName("");
      setRemarks("");
      // Refresh available items
      const fresh = await fetchStockItems(activeLab.id, { limit: 100 });
      setAllItems(fresh.items.filter((i) => i.currentQty > 0));
    } catch (e: unknown) {
      if (e && typeof e === "object" && "details" in e) {
        setValidationErrors((e as { details: string[] }).details);
      } else {
        setError(e instanceof Error ? e.message : "Failed to issue stock");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const totalValue = basket.reduce((sum, b) => sum + b.item.pricePaise * b.quantity, 0);

  if (!activeLab) return (
    <div className="py-16 text-center text-sm text-slate-500">
      No lab workspace selected. <Link href="/dashboard/logbook" className="text-slate-900 underline">Set one up</Link>
    </div>
  );

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;

  if (!permissions?.canIssueStock) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm text-amber-800">You do not have permission to issue stock.</p>
    </div>
  );

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Issue Stock</h2>
        <p className="text-sm text-slate-500">Search and add items to issue them for lab use. All changes are logged.</p>
      </div>

      {successMsg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-800">
          ✓ {successMsg}
        </div>
      )}

      {/* Search Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Search & Add Items</label>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            id="issue-search"
            type="search"
            placeholder="Type item name, CAS, or catalogue number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            autoComplete="off"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToBasket(item)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.casNo ? `CAS: ${item.casNo} · ` : ""}
                      {item.make ? `${item.make} · ` : ""}
                      Available: {item.currentQty} unit(s)
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-900"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-lg">
              No matching items with available stock.
            </div>
          )}
        </div>
      </div>

      {/* Issue Basket */}
      {basket.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">
              Items to Issue
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{basket.length}</span>
            </h3>
            <span className="text-xs text-slate-500">Total value: <span className="font-semibold text-slate-800">{formatPaise(totalValue)}</span></span>
          </div>
          <div className="divide-y divide-slate-50">
            {basket.map((b) => (
              <div key={b.itemId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{b.item.name}</p>
                  <p className="text-xs text-slate-500">
                    Available: {b.item.currentQty} · {formatPaise(b.item.pricePaise)}/unit
                    {b.item.category ? ` · ${b.item.category.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty(b.itemId, b.quantity - 1)} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">−</button>
                  <input
                    type="number" min={1} max={b.item.currentQty}
                    value={b.quantity}
                    onChange={(e) => setQty(b.itemId, parseInt(e.target.value) || 1)}
                    className="h-8 w-14 rounded-lg border border-slate-200 text-center text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
                  />
                  <button type="button" onClick={() => setQty(b.itemId, b.quantity + 1)} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold">+</button>
                </div>
                <span className="text-xs font-semibold text-slate-700 w-16 text-right">{formatPaise(b.item.pricePaise * b.quantity)}</span>
                <button type="button" onClick={() => removeFromBasket(b.itemId)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issue Form */}
      {basket.length > 0 && (
        <form onSubmit={handleIssue} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Issue Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Purpose / Experiment</label>
              <input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. DNA Extraction" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Project Name</label>
              <input className={inputCls} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. CRISPR-v2" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Remarks</label>
            <textarea rows={2} className={inputCls} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes…" />
          </div>

          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-700 mb-2">Cannot issue — please fix the following:</p>
              <ul className="space-y-1">
                {validationErrors.map((e, i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}
              </ul>
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{basket.length} item(s) · {basket.reduce((s, b) => s + b.quantity, 0)} unit(s) total</p>
              <p className="text-xs text-slate-500">Value: {formatPaise(totalValue)}</p>
            </div>
            <button
              type="submit"
              disabled={submitting || basket.length === 0}
              id="confirm-issue-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? "Issuing…" : "Confirm Issue"}
              {!submitting && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              )}
            </button>
          </div>
        </form>
      )}

      {basket.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-400">Search above to add items to the issue list.</p>
        </div>
      )}
    </div>
  );
}
