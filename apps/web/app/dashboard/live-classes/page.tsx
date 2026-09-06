"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createLiveClassPaymentOrder, fetchLiveClasses, verifyLiveClassPayment, type LiveClass } from "@/lib/api";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: RazorpayResponse) => void) => void } } }

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export default function LiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => { fetchLiveClasses().then(setClasses).catch((err) => setError(err instanceof Error ? err.message : "Unable to load classes")).finally(() => setLoading(false)); }, []);

  const buy = async (item: LiveClass) => {
    setPaying(item.id); setError(null);
    try {
      const order = await createLiveClassPaymentOrder(item.id);
      if (order.free) { setClasses((current) => current.map((entry) => entry.id === item.id ? { ...entry, isEnrolled: true } : entry)); return; }
      if (!order.orderId || !order.paymentId || !order.keyId || !(await loadRazorpay()) || !window.Razorpay) throw new Error("Payment gateway could not be loaded");
      const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: "CellsInVitro", description: item.title, order_id: order.orderId, theme: { color: "#0f172a" }, handler: async (response: RazorpayResponse) => { await verifyLiveClassPayment(item.id, { paymentId: order.paymentId!, ...response }); setClasses((current) => current.map((entry) => entry.id === item.id ? { ...entry, isEnrolled: true } : entry)); } });
      checkout.open();
    } catch (err) { setError(err instanceof Error ? err.message : "Payment failed"); }
    finally { setPaying(null); }
  };

  return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Learning live</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Live Classes</h1><p className="mt-2 max-w-xl text-sm text-slate-500">Join practical sessions with CellsInVitro instructors and researchers.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{classes.filter((item) => item.status === "LIVE").length} live now</span></header>
    {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading live classes...</div> : classes.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-950">No live classes scheduled</h2><p className="mt-2 text-sm text-slate-500">New sessions will appear here when they are published.</p></div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{classes.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative flex h-36 items-end justify-between bg-linear-to-br from-slate-900 via-slate-800 to-slate-600 bg-cover bg-center p-4 text-white" style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : undefined}><span className="relative rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">{item.status === "LIVE" ? "Live now" : item.status.toLowerCase()}</span><span className="relative text-xs">{item.isPaid ? `₹${(item.price / 100).toLocaleString("en-IN")}` : "Free"}</span></div><div className="p-5"><h2 className="font-semibold text-slate-950">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.teacher.name || item.teacher.email}</p><div className="mt-4 space-y-1 text-xs text-slate-500"><p>{formatDate(item.scheduledAt)} · {item.startTime}–{item.duration}min</p><p>{item._count.enrollments} enrolled · {item.course?.title || "Independent session"}</p></div><div className="mt-5">{item.status === "LIVE" && (!item.isPaid || item.isEnrolled) ? <Link href={`/live-class/${item.id}`} className="block rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-800">Join live class</Link> : item.isEnrolled ? <Link href={`/live-class/${item.id}`} className="block rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50">View class</Link> : item.status === "SCHEDULED" ? <button type="button" onClick={() => buy(item)} disabled={paying === item.id} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{paying === item.id ? "Processing..." : item.isPaid ? "Buy access" : "Enroll free"}</button> : <span className="block rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">Class unavailable</span>}</div></div></article>)}</div>}
  </div>;
}
