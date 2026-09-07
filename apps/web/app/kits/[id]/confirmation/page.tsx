"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchKitOrder, type KitOrder } from "@/lib/api";
import { formatCourseDate, formatPrice } from "@/lib/courses";
import Navbar from "@/components/Navbar";

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function KitConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<KitOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchKitOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load order details");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 sm:p-12">
            <div className="mx-auto h-14 w-14 rounded-full bg-slate-200" />
            <div className="mx-auto mt-6 h-8 max-w-xs rounded bg-slate-200" />
            <div className="mx-auto mt-3 h-4 max-w-md rounded bg-slate-100" />
            <div className="mt-10 h-48 rounded-2xl bg-slate-100" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
              Order lookup
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Your payment was received
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              We could not load the receipt right now. Your order will still appear in your order history shortly.
            </p>
            <Link
              href="/dashboard/orders"
              className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              View order history
            </Link>
          </div>
        ) : order ? (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
              <div className="border-b border-slate-100 px-6 py-10 text-center sm:px-10 sm:py-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-8 w-8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                  </svg>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
                  Payment successful
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Thank you for your order
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Your research kit order is confirmed. We will prepare it for dispatch and keep its progress updated in your order history.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                  <span>Order placed {formatCourseDate(order.createdAt)}</span>
                  <span aria-hidden="true">•</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                    {statusLabel(order.fulfillmentStatus)}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_20rem]">
                <div>
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-200 sm:h-24 sm:w-32">
                      {order.imageUrl ? (
                        <Image src={order.imageUrl} alt="" fill sizes="128px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Research kit</p>
                      <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">{order.itemTitle}</h2>
                      <p className="mt-1 text-sm text-slate-500">Quantity: {order.quantity}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Order information</h2>
                      <span className="text-xs font-semibold text-emerald-600">{statusLabel(order.paymentStatus)}</span>
                    </div>
                    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-400">Order ID</dt>
                        <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">{order.id}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Order date</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-800">{formatCourseDate(order.createdAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <aside className="space-y-6">
                  <section className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Payment summary</h2>
                    <div className="mt-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                      <span className="text-sm text-slate-400">Total paid</span>
                      <span className="text-2xl font-semibold">{formatPrice(order.amount, order.currency)}</span>
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4 text-slate-400"><dt>Quantity</dt><dd className="text-white">{order.quantity}</dd></div>
                      <div className="flex justify-between gap-4 text-slate-400"><dt>Payment</dt><dd className="text-emerald-300">{statusLabel(order.paymentStatus)}</dd></div>
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery details</h2>
                    <p className="mt-4 text-sm font-semibold text-slate-950">{order.customerName || "Order recipient"}</p>
                    <p className="mt-1 text-sm text-slate-500">{order.customerEmail}</p>
                    {order.customerPhone ? <p className="mt-1 text-sm text-slate-500">{order.customerPhone}</p> : null}
                    <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">{order.shippingAddress || "Shipping details saved with your order."}</p>
                  </section>
                </aside>
              </div>
            </section>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
              <p className="text-sm text-slate-500">You can track updates and delivery details from your order history.</p>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-end">
                <Link href="/dashboard/orders" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">View order history</Link>
                <Link href="/kits" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">Continue shopping</Link>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Order received</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Your purchase was submitted. Sign in to view the full receipt and tracking details.</p>
            <Link href="/dashboard/orders" className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">View order history</Link>
          </div>
        )}
      </div>
    </main>
  );
}