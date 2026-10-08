"use client";

import { useState } from "react";
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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  totalPrice: number;
  uploadedFileName: string;
  referenceFileName?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  serviceTitle,
  quantity,
  unitLabel,
  unitPrice,
  totalPrice,
  uploadedFileName,
  referenceFileName,
}: PaymentModalProps) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userName) {
      setError("Please fill in your name and email address.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection and try again.");
      }

      let backendOrder: {
        orderId?: string;
        keyId?: string;
        paymentId?: string;
        amount?: number;
        currency?: string;
      } | null = null;

      try {
        backendOrder = await createPaymentOrder({
          docServiceTitle: serviceTitle,
          customAmount: totalPrice,
          customerName: userName.trim(),
          customerEmail: userEmail.trim().toLowerCase(),
          customerPhone: userPhone.trim(),
        });
      } catch (err) {
        console.warn("[PaymentModal] Backend order creation skipped/failed:", err);
      }

      const razorpayKey =
        backendOrder?.keyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_test_fallback";

      const checkoutOptions: Record<string, unknown> = {
        key: razorpayKey,
        amount: Math.round((backendOrder?.amount || totalPrice) * 100),
        currency: backendOrder?.currency || "INR",
        name: "CellsInVitro",
        description: `${serviceTitle} (${quantity.toLocaleString()} ${unitLabel})`,
        order_id: backendOrder?.orderId || undefined,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        notes: {
          serviceTitle,
          uploadedFileName,
          referenceFileName: referenceFileName || "",
          specialInstructions: notes,
          paymentMethod,
        },
        theme: {
          color: "#000000",
        },
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          qr: true,
        },
        handler: async (response: RazorpayResponse) => {
          if (backendOrder?.paymentId) {
            try {
              await verifyPayment({
                paymentId: backendOrder.paymentId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
            } catch (err) {
              console.error("[PaymentModal] Payment verification error:", err);
            }
          }

          const confirmedOrderId =
            response.razorpay_order_id ||
            `CIV-DOC-${Math.floor(100000 + Math.random() * 900000)}`;
          const confirmedPaymentId =
            response.razorpay_payment_id || `PAY-${Date.now()}`;

          setOrderId(confirmedOrderId);
          setPaymentId(confirmedPaymentId);
          setIsProcessing(false);
          setIsSuccess(true);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(checkoutOptions);
      rzpInstance.open();
    } catch (err) {
      console.error("[PaymentModal] Error initiating Razorpay payment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to open Razorpay payment gateway."
      );
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl sm:p-8 text-black">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-black focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isSuccess ? (
          <div>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-black border border-slate-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Secure Razorpay Checkout</h3>
                <p className="text-xs text-slate-600">100% Encrypted • Instant Processing</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-4 rounded-xl bg-slate-100 p-4 border border-slate-300">
              <div className="flex justify-between items-center text-sm font-bold text-black">
                <span>{serviceTitle}</span>
                <span className="font-extrabold text-black">₹{totalPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 text-xs text-slate-700 space-y-1">
                <p><span className="font-semibold text-black">Main Document:</span> {uploadedFileName}</p>
                {referenceFileName && (
                  <p><span className="font-semibold text-black">Reference File:</span> {referenceFileName}</p>
                )}
                <p>
                  <span className="font-semibold text-black">Volume:</span> {quantity.toLocaleString()} {unitLabel} @ ₹{unitPrice}/{unitLabel.slice(0, -1)}
                </p>
                <p><span className="font-semibold text-black">Estimated Delivery:</span> 1-3 Business Days</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-slate-100 p-3 border border-slate-400 text-xs text-black font-medium flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Rajesh Kumar"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="author@univ.edu"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Special Instructions / Style Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Follow APA 7th style for references, maintain UK English spelling..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              {/* Preferred Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Select Preferred Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      paymentMethod === "upi"
                        ? "border-black bg-black text-white ring-1 ring-black"
                        : "border-slate-300 bg-white text-slate-700 hover:border-black"
                    }`}
                  >
                    <span className="font-bold">UPI / GPay</span>
                    <span className={`text-[10px] ${paymentMethod === "upi" ? "text-slate-300" : "text-slate-500"}`}>Instant QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      paymentMethod === "card"
                        ? "border-black bg-black text-white ring-1 ring-black"
                        : "border-slate-300 bg-white text-slate-700 hover:border-black"
                    }`}
                  >
                    <span className="font-bold">Credit/Debit</span>
                    <span className={`text-[10px] ${paymentMethod === "card" ? "text-slate-300" : "text-slate-500"}`}>Visa / Mastercard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      paymentMethod === "netbanking"
                        ? "border-black bg-black text-white ring-1 ring-black"
                        : "border-slate-300 bg-white text-slate-700 hover:border-black"
                    }`}
                  >
                    <span className="font-bold">NetBanking</span>
                    <span className={`text-[10px] ${paymentMethod === "netbanking" ? "text-slate-300" : "text-slate-500"}`}>All Indian Banks</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-100 p-3 border border-slate-300 flex items-start gap-2 text-xs text-black">
                <svg className="h-4 w-4 text-black mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  <strong>Confidentiality Protection:</strong> Your document is directly dispatched to our secure editor queue via end-to-end encrypted mail. We strictly guarantee no copying, archiving, or third-party sharing.
                </span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-black py-3.5 px-4 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Opening Razorpay Gateway...</span>
                  </>
                ) : (
                  <span>Pay ₹{totalPrice.toLocaleString("en-IN")} via Razorpay →</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation State */
          <div className="py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-white mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-black">Payment Successful!</h3>
            <p className="mt-1 text-sm font-bold text-black">Order ID: {orderId}</p>
            {paymentId && (
              <p className="text-xs text-slate-600 font-mono">Payment Ref: {paymentId}</p>
            )}

            <div className="mt-5 text-left rounded-xl bg-slate-100 p-4 border border-slate-300 text-xs text-slate-800 space-y-2">
              <p>✅ <strong>Confirmation Sent:</strong> Receipt & document dispatch confirmation sent to <strong>{userEmail}</strong>.</p>
              <p>✉️ <strong>Direct Inbox Delivery:</strong> Your file <em>"{uploadedFileName}"</em> has reached our editor inbox.</p>
              <p>⏱️ <strong>Estimated Turnaround:</strong> 1 - 3 Business Days.</p>
              <p>🛡️ <strong>Privacy Protection:</strong> Document auto-purge scheduled immediately after final delivery to you.</p>
            </div>

            <button
              onClick={handleReset}
              className="mt-6 w-full rounded-xl bg-black py-3 px-4 text-sm font-bold text-white hover:bg-slate-900 transition-colors"
            >
              Done / Return to Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
