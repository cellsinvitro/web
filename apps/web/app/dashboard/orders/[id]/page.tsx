"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchKitOrder, type KitOrder } from "@/lib/api";
import { formatCourseDate, formatPrice } from "@/lib/courses";

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<KitOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKitOrder(params.id).then(setOrder).catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"));
  }, [params.id]);

  if (error) return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></div>;
  if (!order) return <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><p className="text-sm text-slate-500">Loading order...</p></div>;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <Link href="/dashboard/orders" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Order history</Link>
      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Order tracking</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{order.itemTitle}</h1><p className="mt-2 text-sm text-slate-500">Order {order.id} · {formatCourseDate(order.createdAt)}</p></div>
        <span className="w-fit rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">{statusLabel(order.fulfillmentStatus)}</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Tracking timeline</h2>
          <ol className="mt-6 space-y-6">
            {order.events.map((event, index) => <li key={event.id} className="relative flex gap-4"><span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === order.events.length - 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{index + 1}</span><div><p className="font-semibold text-slate-950">{statusLabel(event.status)}</p><p className="mt-1 text-xs text-slate-500">{formatCourseDate(event.createdAt)}{event.location ? ` · ${event.location}` : ""}</p>{event.note ? <p className="mt-2 text-sm text-slate-600">{event.note}</p> : null}</div></li>)}
          </ol>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Order summary</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4 text-slate-500"><dt>Quantity</dt><dd>{order.quantity}</dd></div><div className="flex justify-between gap-4 text-slate-500"><dt>Total</dt><dd className="font-semibold text-slate-950">{formatPrice(order.amount, order.currency)}</dd></div><div className="flex justify-between gap-4 text-slate-500"><dt>Payment</dt><dd>{statusLabel(order.paymentStatus)}</dd></div></dl>{order.carrier || order.trackingNumber ? <div className="mt-5 border-t border-slate-100 pt-5 text-sm"><p className="font-medium text-slate-950">Shipment</p><p className="mt-2 text-slate-500">{order.carrier || "Carrier pending"}</p><p className="mt-1 break-all font-mono text-xs text-slate-600">{order.trackingNumber || "Tracking number pending"}</p></div> : null}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery details</h2><p className="mt-4 text-sm font-medium text-slate-950">{order.customerName}</p><p className="mt-1 text-sm text-slate-500">{order.customerPhone}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{order.shippingAddress}</p></section>
        </aside>
      </div>
    </div>
  );
}
