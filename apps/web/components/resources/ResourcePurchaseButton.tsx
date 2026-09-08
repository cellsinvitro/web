"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPaymentOrder, verifyPayment } from "@/lib/api";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: RazorpayResponse) => void) => void;
    };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ResourcePurchaseButton({
  resourceScope,
  studyMaterialId,
  studyMaterialFileId,
  price,
  label,
  className,
  onSuccess,
}: {
  resourceScope: "FULL_LIBRARY" | "MODULE" | "FILE";
  studyMaterialId?: string;
  studyMaterialFileId?: string;
  price: number;
  label?: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel =
    label ||
    (price > 0
      ? `Buy Access - ₹${price}`
      : "Unlock Free Access");

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await createPaymentOrder({
        resourceScope,
        studyMaterialId,
        studyMaterialFileId,
      });

      if (order.free) {
        onSuccess ? onSuccess() : router.refresh();
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Failed to load payment gateway");
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CellsInVitro",
        description:
          resourceScope === "FULL_LIBRARY"
            ? "Resource Library - Full Access"
            : resourceScope === "MODULE"
            ? "Resource Module Access"
            : "Resource File Access",
        order_id: order.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            await verifyPayment({
              paymentId: order.paymentId!,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess ? onSuccess() : router.refresh();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Payment verification failed"
            );
          }
        },
        theme: { color: "#0f172a" },
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={handlePurchase}
        disabled={loading}
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-60"
        }
      >
        {loading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          defaultLabel
        )}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
