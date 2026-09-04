"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createConsultancyBookingOrder,
  cancelConsultancyBooking,
  fetchConsultancyConsultant,
  verifyConsultancyPayment,
  type ConsultancyConsultant,
} from "@/lib/api";

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

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default function ConsultancyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [consultant, setConsultant] = useState<ConsultancyConsultant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [consultationType, setConsultationType] = useState<string>("");
  const [userDetails, setUserDetails] = useState({ name: "", email: "", phone: "", notes: "" });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function load() {
      const { id } = await params;
      try {
        const data = await fetchConsultancyConsultant(id);
        if (active) {
          setConsultant(data);
          setConsultationType(data.consultationTypes[0] ?? "VIDEO");
          const uniqueDates = [...new Set(data.slots.map((slot) => slot.date.slice(0, 10)))].sort();
          if (uniqueDates.length > 0) {
            const firstDate = uniqueDates[0];
            if (firstDate) {
              setSelectedDate(firstDate);
              const firstAvailable = data.slots.find((slot) => slot.date.slice(0, 10) === firstDate && !slot.isBooked);
              if (firstAvailable) setSelectedSlotId(firstAvailable.id);
            }
          }
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load consultant");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [params]);

  const availableDates = useMemo(() => {
    if (!consultant) return [];
    return [...new Set(consultant.slots.filter((slot) => !slot.isBooked).map((slot) => slot.date.slice(0, 10)))].sort();
  }, [consultant]);

  const slotOptions = useMemo(() => {
    if (!consultant) return [];
    return consultant.slots.filter((slot) => !slot.isBooked && slot.date.slice(0, 10) === selectedDate);
  }, [consultant, selectedDate]);

  useEffect(() => {
    if (slotOptions.length > 0 && !slotOptions.some((slot) => slot.id === selectedSlotId)) {
      const firstAvailableSlot = slotOptions[0];
      if (firstAvailableSlot) {
        setSelectedSlotId(firstAvailableSlot.id);
      }
    }
  }, [slotOptions, selectedSlotId]);

  const handlePayment = async () => {
    if (!consultant || !selectedSlotId || !consultationType) {
      setError("Please complete the booking details before booking.");
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const order = await createConsultancyBookingOrder({
        consultantId: consultant.id,
        slotId: selectedSlotId,
        consultationType,
        userName: userDetails.name,
        userEmail: userDetails.email,
        userPhone: userDetails.phone,
        notes: userDetails.notes,
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Failed to load payment gateway");
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CellsInVitro",
        description: `${consultant.name} consultation`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyConsultancyPayment({
              bookingId: order.bookingId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setBookingId(null);
            router.push("/dashboard/consultancy");
          } catch (err) {
            await cancelConsultancyBooking(order.bookingId).catch(() => undefined);
            setError(err instanceof Error ? err.message : "Payment verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            await cancelConsultancyBooking(order.bookingId).catch(() => undefined);
            setBookingId(null);
            setError("Payment was cancelled. The slot is still available.");
          },
        },
        theme: { color: "#0f172a" },
      });

      setBookingId(order.bookingId);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete booking");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-80 rounded-3xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Consultant not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/consultancy" className="hover:text-slate-800">Consultancy</Link>
        <span>/</span>
        <span className="text-slate-700">{consultant.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-72 overflow-hidden bg-slate-100">
            {consultant.photoUrl ? (
              <img src={consultant.photoUrl} alt={consultant.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-3xl font-semibold text-white">
                {consultant.name.split(" ").slice(0,2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
              </div>
            )}
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="mt-2 text-3xl font-semibold text-slate-950">{consultant.name}</h1>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
                  {consultant.available ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="mt-2 text-base text-slate-600">{consultant.title || "Consultant"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Experience</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{consultant.experienceYears}+ yrs</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rate</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">₹{consultant.hourlyRate}/hr</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Duration</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{consultant.durationMinutes} min</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Expertise</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {consultant.expertise.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{item}</span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Bio</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{consultant.bio || "This consultant has not added a bio yet."}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Book consultation</h2>
          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consultation type</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {consultant.consultationTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setConsultationType(type)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      consultationType === type ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Available dates</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableDates.length === 0 ? (
                  <p className="text-sm text-slate-500">No slots available.</p>
                ) : (
                  availableDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                        selectedDate === date ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {formatDate(`${date}T00:00:00`)}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Time slot</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {slotOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">No time slots are available for the selected date.</p>
                ) : (
                  slotOptions.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        selectedSlotId === slot.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={userDetails.name}
                onChange={(event) => setUserDetails((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Your full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <input
                type="email"
                value={userDetails.email}
                onChange={(event) => setUserDetails((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email address"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <input
                type="tel"
                value={userDetails.phone}
                onChange={(event) => setUserDetails((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
              <textarea
                value={userDetails.notes}
                onChange={(event) => setUserDetails((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                placeholder="Notes for the consultant"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Consultation fee</span>
                <span className="text-lg font-semibold text-slate-950">₹{consultant.hourlyRate}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayment}
              disabled={paymentLoading || !selectedSlotId || !userDetails.name || !userDetails.email}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading ? "Opening payment…" : `Book now · ₹${consultant.hourlyRate}`}
            </button>

            {bookingId ? <p className="text-xs text-slate-500">Booking reference: {bookingId}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
