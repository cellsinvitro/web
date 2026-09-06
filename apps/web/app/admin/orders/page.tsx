"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminKitOrders, updateAdminKitOrder, type KitFulfillmentStatus, type KitOrder } from "@/lib/api";
import { formatCourseDate, formatPrice } from "@/lib/courses";

const statuses: KitFulfillmentStatus[] = ["PROCESSING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"];
function label(status: string) { return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [selected, setSelected] = useState<KitOrder | null>(null);
  const [status, setStatus] = useState<KitFulfillmentStatus>("PROCESSING");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchAdminKitOrders({ search }); setOrders(data.orders); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load orders"); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { void load(); }, [load]);

  const choose = (order: KitOrder) => {
    setSelected(order); setStatus(order.fulfillmentStatus); setCarrier(order.carrier || ""); setTrackingNumber(order.trackingNumber || ""); setNote(""); setLocation("");
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true); setError(null);
    try { const updated = await updateAdminKitOrder(selected.id, { status, carrier: carrier || null, trackingNumber: trackingNumber || null, note: note || null, location: location || null }); setSelected(updated); setOrders((current) => current.map((item) => item.id === updated.id ? updated : item)); setNote(""); setLocation(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update order"); }
    finally { setSaving(false); }
  };

  return <div className="min-h-dvh bg-slate-50/50 px-4 py-6 sm:px-8 sm:py-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Operations</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Kit orders</h1><p className="mt-1 text-sm text-slate-500">Manage fulfillment and shipment tracking.</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="Search orders" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950" /><button type="button" onClick={() => void load()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Search</button></div></div>{error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]"><section className="space-y-3">{loading ? <p className="text-sm text-slate-500">Loading orders...</p> : orders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No kit orders found.</div> : orders.map((order) => <button key={order.id} type="button" onClick={() => choose(order)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-colors ${selected?.id === order.id ? "border-slate-950" : "border-slate-200 hover:border-slate-300"}`}><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{order.itemTitle}</p><p className="mt-1 text-xs text-slate-500">{order.user?.email} · {formatCourseDate(order.createdAt)}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{label(order.fulfillmentStatus)}</span></div><p className="mt-3 text-sm text-slate-600">Qty {order.quantity} · {formatPrice(order.amount, order.currency)} · {order.paymentStatus}</p></button>)}</section><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{selected ? <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Update order</p><h2 className="mt-2 wrap-break-word font-semibold text-slate-950">{selected.itemTitle}</h2><p className="mt-1 break-all text-xs text-slate-500">{selected.id}</p><div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Status<select value={status} onChange={(event) => setStatus(event.target.value as KitFulfillmentStatus)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Carrier<input value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Tracking number<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Update note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Location<input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><button type="button" onClick={() => void save()} disabled={saving} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save update"}</button></div></> : <p className="text-sm text-slate-500">Select an order to update fulfillment details.</p>}</aside></div></div>;
}
