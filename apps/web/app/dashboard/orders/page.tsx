"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchKitOrders, type KitOrder } from "@/lib/api";
import { formatPrice, formatCourseDate } from "@/lib/courses";

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKitOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Orders</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Order history</h1>
      <p className="mt-2 text-sm text-slate-500">Track your CellsInVitro research kit purchases.</p>

      {loading ? <p className="mt-8 text-sm text-slate-500">Loading orders...</p> : null}
      {error ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {!loading && !error && orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="font-medium text-slate-950">No kit orders yet</p>
          <Link href="/dashboard/kits" className="mt-3 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950">Browse research kits</Link>
        </div>
      ) : null}
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">{order.itemTitle}</p>
                <p className="mt-1 text-xs text-slate-500">Order {order.id} · {formatCourseDate(order.createdAt)} · Qty {order.quantity}</p>
              </div>
              <div className="flex items-center gap-4 sm:text-right">
                <div>
                  <p className="font-semibold text-slate-950">{formatPrice(order.amount, order.currency)}</p>
                  <p className="mt-1 text-xs text-slate-500">Payment {statusLabel(order.paymentStatus)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{statusLabel(order.fulfillmentStatus)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
