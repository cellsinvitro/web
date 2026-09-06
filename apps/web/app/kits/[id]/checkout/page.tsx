"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import KitPurchaseButton from "@/components/kits/KitPurchaseButton";
import { fetchKit } from "@/lib/api";
import type { ResearchKit } from "@/lib/api";

export default function KitCheckoutPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [kit, setKit] = useState<ResearchKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchKit(params.id)
      .then((data) => {
        if (!cancelled) setKit(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load kit");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const requestedQuantity = Math.max(
    1,
    Number.parseInt(searchParams.get("quantity") || "1", 10) || 1,
  );

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-12 pt-24 sm:px-8 sm:pb-16 sm:pt-28">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="h-96 animate-pulse rounded-3xl bg-white" />
        ) : error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : kit ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Research kit checkout
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Complete your order
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your details to continue with payment for {kit.title}.
            </p>
            <div className="mt-8">
              <KitPurchaseButton
                kitId={kit.id}
                title={kit.title}
                price={kit.price}
                currency={kit.currency}
                stock={kit.stock}
                checkoutPage
                initialQuantity={requestedQuantity}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
