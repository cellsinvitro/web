"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  type ToolSubscriptionPlan,
  type ToolsStatusResponse,
  createPaymentOrder,
  verifyPayment,
} from "@/lib/api";

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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ToolsSubscriptionPanel({
  status,
  onSubscriptionSuccess,
}: {
  status: ToolsStatusResponse | null;
  onSubscriptionSuccess?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const plans = status?.plans || [];
  const defaultSelectedId = plans[2]?.id || plans[0]?.id || "";
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultSelectedId);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activePlanId = selectedPlanId || (plans[0]?.id ?? "");
  const selectedPlan = plans.find((p) => p.id === activePlanId) || plans[0];

  const handleSubscribe = async (planToBuy?: ToolSubscriptionPlan) => {
    const targetPlan = planToBuy || selectedPlan;
    if (!targetPlan) return;

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/tools#subscription-plans")}`);
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const order = await createPaymentOrder({ toolPlanId: targetPlan.id });

      if (order.free) {
        setSuccessMessage("Your unlimited subscription has been activated!");
        onSubscriptionSuccess?.();
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Payment gateway could not be loaded. Please check your internet connection.");
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "CellsInVitro",
        description: `Tools Unlimited - ${targetPlan.name}`,
        order_id: order.orderId,
        prefill: {
          name: user.name || "",
          email: user.email,
        },
        handler: async (response: RazorpayResponse) => {
          try {
            await verifyPayment({
              paymentId: order.paymentId!,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccessMessage("Payment successful! Unlimited calculations are now active.");
            onSubscriptionSuccess?.();
          } catch (err: any) {
            setError(err?.message || "Payment verification failed. Please contact support if amount was debited.");
          }
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });

      rzp.open();
    } catch (err: any) {
      setError(err?.message || "Could not initiate payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (status?.isSubscriber) {
    const formattedExpiry = status.subscription?.expiresAt
      ? new Date(status.subscription.expiresAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Active";

    return (
      <div
        id="subscription-plans"
        className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Active Subscription
          </span>
        </div>

        <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
          Tools Unlimited Access
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Your account has full unlimited access to all scientific calculators and future lab tools.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-900">
            <span className="font-medium">Plan tier:</span>
            <span className="font-bold">{status.subscription?.planName || "Unlimited"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-900 border-t border-emerald-200/60 pt-2">
            <span className="font-medium">Valid until:</span>
            <span className="font-bold">{formattedExpiry}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Included Benefits
          </p>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              Unlimited calculations with zero daily limits
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              All 4 scientific tools (IC₅₀, Cell Counting, Molarity, Dilution)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              Automatic access to all future bench tools
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      id="subscription-plans"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Unlimited Pass
        </div>

        <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          {status?.generalSetting?.subscriptionCtaTitle || "Tools Unlimited Access"}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {status?.generalSetting?.subscriptionCtaDescription ||
            "Unlock unlimited calculations across all scientific tools, including future additions."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
            {successMessage}
          </div>
        )}

        {/* Plan selection grid */}
        <div className="mt-5 space-y-2.5">
          {plans.map((plan) => {
            const isSelected = (selectedPlanId || plans[0]?.id) === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                  isSelected
                    ? "border-slate-950 bg-slate-50/80 ring-1 ring-slate-950"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{plan.name}</span>
                  </div>

                  <div className="flex items-baseline gap-1.5 text-right">
                    {plan.isOfferActive && plan.offerPrice !== null ? (
                      <>
                        <span className="text-xs text-slate-400 line-through">
                          ₹{plan.regularPrice}
                        </span>
                        <span className="text-base font-extrabold text-slate-950">
                          ₹{plan.offerPrice}
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-extrabold text-slate-950">
                        ₹{plan.regularPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits list */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Included Benefits
          </p>
          <ul className="mt-2.5 space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="text-slate-950 font-bold">✓</span>
              Unlimited calculations with zero daily limits
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-950 font-bold">✓</span>
              All current & future scientific tools included
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-950 font-bold">✓</span>
              Access throughout entire subscription period
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-950 font-bold">✓</span>
              No hidden per-calculation charges
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => handleSubscribe()}
          disabled={processing || plans.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {processing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing Order...</span>
            </>
          ) : user ? (
            <>
              Subscribe Now ({selectedPlan?.isOfferActive && selectedPlan?.offerPrice !== null ? `₹${selectedPlan.offerPrice}` : `₹${selectedPlan?.regularPrice || 0}`})
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </>
          ) : (
            "Login to Subscribe"
          )}
        </button>
      </div>
    </div>
  );
}
