"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPaymentOrder, verifyPayment } from "@/lib/api";
import DiscountedPrice from "@/components/DiscountedPrice";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: RazorpayResponse) => void) => void;
    };
  }
}

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

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export default function KitPurchaseButton({
  kitId,
  title,
  price,
  originalPrice,
  currency = "INR",
  stock,
  checkoutPage = false,
  initialQuantity = 1,
  onSuccess,
}: {
  kitId: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  stock: number;
  checkoutPage?: boolean;
  initialQuantity?: number;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(
    Math.min(Math.max(initialQuantity, 1), Math.max(stock, 1)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const unavailable = stock <= 0;
  const total = price * quantity;

  const updateCustomer = (field: keyof CustomerDetails, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
  };

  const openCheckout = () => {
    setError(null);
    router.push(`/kits/${kitId}/checkout?quantity=${quantity}`);
  };

  const purchase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const order = await createPaymentOrder({
        kitId,
        quantity,
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim(),
        customerPhone: customer.phone.trim(),
        shippingAddress: customer.address.trim(),
      });

      if (order.free) {
        onSuccess?.();
        router.push(
          `/kits/${kitId}/confirmation?orderId=${encodeURIComponent(order.paymentId ?? "")}`
        );
        setLoading(false);
        return;
      }

      if (
        !order.orderId ||
        !order.paymentId ||
        !order.keyId ||
        !(await loadRazorpay()) ||
        !window.Razorpay
      ) {
        throw new Error("Payment gateway could not be loaded");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CellsInVitro",
        description: `${title} x ${quantity}`,
        order_id: order.orderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        theme: { color: "#0f172a" },
handler: async (response: RazorpayResponse) => {
            try {
              await verifyPayment({ paymentId: order.paymentId!, ...response });
              onSuccess?.();
              router.push(
                `/kits/${kitId}/confirmation?orderId=${encodeURIComponent(order.paymentId!)}`
              );
            } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
      setLoading(false);
    }
  };

  return (
    <>
      {!checkoutPage ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Price
            </p>
            {/* TODO: Replace with actual price display once pricing is set.
                Example: <DiscountedPrice price={price} originalPrice={originalPrice} currency={currency} /> */}
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-500 italic">
              Coming soon
            </p>
          </div>
        </div>

        {/* TODO: Uncomment quantity selector and order total once pricing is active.
        <div className="mt-5 grid grid-cols-[7rem_1fr] items-center gap-3">
          <label htmlFor={`${kitId}-quantity`} className="text-sm font-medium text-slate-700">
            Quantity
          </label>
          <input
            id={`${kitId}-quantity`}
            type="number"
            min={1}
            max={Math.max(1, stock)}
            value={quantity}
            onChange={(event) => {
              const nextQuantity = Number(event.target.value);
              setQuantity(Math.min(Math.max(nextQuantity || 1, 1), Math.max(stock, 1)));
            }}
            disabled={unavailable}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">Order total</span>
          <span className="font-semibold text-slate-950">{formatPrice(total, currency)}</span>
        </div>
        */}

        {/* TODO: Replace with actual Buy / Out of stock button once pricing is active.
        <button
          type="button"
          onClick={openCheckout}
          disabled={unavailable}
          className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {unavailable ? "Out of stock" : "Buy this kit"}
        </button>
        */}
        <p className="mt-5 text-sm text-slate-500">
          Pricing will be available soon. Contact us for early access or enquiries.
        </p>
      </div> : null}

      {checkoutPage ? (
        <div className="w-full">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Complete your order
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Shipping and payment details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/kits/${kitId}`)}
                disabled={loading}
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950 disabled:opacity-50"
              >
                Back to kit
              </button>
            </div>

            <form onSubmit={purchase} className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Name
                    <input required value={customer.name} onChange={(event) => updateCustomer("name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Email
                    <input required type="email" value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                  <input required type="tel" value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Shipping address
                  <textarea required rows={4} value={customer.address} onChange={(event) => updateCustomer("address", event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10" />
                </label>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {loading ? "Preparing payment..." : "Continue to payment"}
                </button>
              </div>

              <aside className="h-fit rounded-2xl bg-slate-50 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Order summary
                </p>
                <div className="mt-5 flex gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">Research kit</p>
                  </div>
                  {/* TODO: Replace with formatPrice(total, currency) once pricing is set */}
                  <p className="font-semibold italic text-slate-500">Coming soon</p>
                </div>
                <dl className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
                  <div className="flex justify-between gap-4 text-slate-500">
                    <dt>Unit price</dt>
                    {/* TODO: Replace with formatPrice(price, currency) once pricing is set */}
                    <dd className="italic">Coming soon</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-500">
                    <dt>Quantity</dt>
                    <dd>{quantity}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-semibold text-slate-950">
                    <dt>Total</dt>
                    {/* TODO: Replace with formatPrice(total, currency) once pricing is set */}
                    <dd className="italic text-slate-500">Coming soon</dd>
                  </div>
                </dl>
              </aside>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
