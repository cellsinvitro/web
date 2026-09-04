"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAdminConsultancyCategory,
  createAdminConsultancyConsultant,
  createAdminConsultancySlot,
  deleteAdminConsultancyCategory,
  deleteAdminConsultancyConsultant,
  deleteAdminConsultancySlot,
  fetchAdminConsultancyBookings,
  fetchAdminConsultancyCategories,
  fetchAdminConsultancyConsultants,
  updateAdminConsultancyBooking,
  updateAdminConsultancyCategory,
  updateAdminConsultancyConsultant,
  type ConsultancyBooking,
  type ConsultancyCategory,
  type ConsultancyConsultant,
} from "@/lib/api";
import { AdminSpinner } from "@/components/AdminLoader";

const inputClass = "rounded-xl border border-slate-200 px-3 py-2 text-sm";

export default function AdminConsultancyPage() {
  const [categories, setCategories] = useState<ConsultancyCategory[]>([]);
  const [consultants, setConsultants] = useState<ConsultancyConsultant[]>([]);
  const [bookings, setBookings] = useState<ConsultancyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [newConsultant, setNewConsultant] = useState({ name: "", categoryId: "", title: "", rate: "0", experience: "0" });
  const [consultantImage, setConsultantImage] = useState<File | null>(null);
  const [consultantImagePreview, setConsultantImagePreview] = useState<string | null>(null);
  const consultantImageRef = useRef<HTMLInputElement>(null);
  const [slotForm, setSlotForm] = useState({ consultantId: "", date: "", startTime: "", endTime: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryData, consultantData, bookingData] = await Promise.all([
        fetchAdminConsultancyCategories(),
        fetchAdminConsultancyConsultants(),
        fetchAdminConsultancyBookings(),
      ]);
      setCategories(categoryData);
      setConsultants(consultantData);
      setBookings(bookingData);
      setNewConsultant((current) => ({ ...current, categoryId: current.categoryId || categoryData[0]?.id || "" }));
      setSlotForm((current) => ({ ...current, consultantId: current.consultantId || consultantData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load consultancy admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!consultantImage) {
      setConsultantImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(consultantImage);
    setConsultantImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [consultantImage]);

  const run = async (action: () => Promise<unknown>) => {
    try { await action(); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
  };

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await run(async () => { await createAdminConsultancyCategory({ name: categoryName.trim() }); setCategoryName(""); });
  };

  const addConsultant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newConsultant.name.trim() || !newConsultant.categoryId) return;
    await run(async () => {
      await createAdminConsultancyConsultant({
        name: newConsultant.name.trim(),
        categoryId: newConsultant.categoryId,
        title: newConsultant.title.trim(),
        hourlyRate: Math.round(Number(newConsultant.rate) || 0),
        experienceYears: Math.round(Number(newConsultant.experience) || 0),
        image: consultantImage ?? undefined,
      });
      setNewConsultant((current) => ({ ...current, name: "", title: "", rate: "0", experience: "0" }));
      setConsultantImage(null);
    });
  };

  const addSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slotForm.consultantId || !slotForm.date || !slotForm.startTime || !slotForm.endTime) return;
    await run(async () => {
      await createAdminConsultancySlot(slotForm.consultantId, { date: slotForm.date, startTime: slotForm.startTime, endTime: slotForm.endTime });
      setSlotForm((current) => ({ ...current, date: "", startTime: "", endTime: "" }));
    });
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><AdminSpinner size={40} /></div>;

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">CMS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Consultancy</h1>
        <p className="mt-2 text-sm text-slate-500">Manage categories, experts, availability and booking status.</p>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Categories</h2>
          <form onSubmit={addCategory} className="mt-4 flex gap-2">
            <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category name" className={`${inputClass} min-w-0 flex-1`} />
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add</button>
          </form>
          <div className="mt-4 space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <input defaultValue={category.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== category.name) run(() => updateAdminConsultancyCategory(category.id, { name: e.target.value.trim() })); }} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none" />
                <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={category.published} onChange={(e) => run(() => updateAdminConsultancyCategory(category.id, { published: e.target.checked }))} /> Published</label>
                <button type="button" onClick={() => run(() => deleteAdminConsultancyCategory(category.id))} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Add consultant</h2>
          <form onSubmit={addConsultant} className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => consultantImageRef.current?.click()} className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 sm:col-span-2">
              {consultantImagePreview ? <img src={consultantImagePreview} alt="Consultant preview" className="h-full w-full object-cover" /> : "Click to add consultant image"}
            </button>
            <input ref={consultantImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { setConsultantImage(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            <input value={newConsultant.name} onChange={(e) => setNewConsultant({ ...newConsultant, name: e.target.value })} placeholder="Full name" className={inputClass} />
            <select value={newConsultant.categoryId} onChange={(e) => setNewConsultant({ ...newConsultant, categoryId: e.target.value })} className={inputClass}><option value="">Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <input value={newConsultant.title} onChange={(e) => setNewConsultant({ ...newConsultant, title: e.target.value })} placeholder="Title / role" className={inputClass} />
            <input type="number" min="0" value={newConsultant.rate} onChange={(e) => setNewConsultant({ ...newConsultant, rate: e.target.value })} placeholder="Hourly rate (INR)" className={inputClass} />
            <input type="number" min="0" value={newConsultant.experience} onChange={(e) => setNewConsultant({ ...newConsultant, experience: e.target.value })} placeholder="Experience (years)" className={inputClass} />
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add consultant</button>
          </form>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Availability</h2>
        <form onSubmit={addSlot} className="mt-4 grid gap-3 sm:grid-cols-4">
          <select value={slotForm.consultantId} onChange={(e) => setSlotForm({ ...slotForm, consultantId: e.target.value })} className={inputClass}><option value="">Consultant</option>{consultants.map((consultant) => <option key={consultant.id} value={consultant.id}>{consultant.name}</option>)}</select>
          <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className={inputClass} />
          <div className="flex gap-2"><input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className={`${inputClass} min-w-0 flex-1`} /><input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className={`${inputClass} min-w-0 flex-1`} /></div>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add slot</button>
        </form>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {consultants.flatMap((consultant) => consultant.slots.map((slot) => <div key={slot.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span><b>{consultant.name}</b><br /><span className="text-slate-500">{new Date(slot.date).toLocaleDateString("en-IN")} · {slot.startTime} - {slot.endTime}</span></span><span className="flex items-center gap-2"><span className={slot.isBooked ? "text-amber-700" : "text-emerald-700"}>{slot.isBooked ? "Booked" : "Open"}</span>{!slot.isBooked ? <button type="button" onClick={() => run(() => deleteAdminConsultancySlot(slot.id))} className="text-xs text-red-600 hover:underline">Remove</button> : null}</span></div>))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Bookings</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Consultant</th><th className="px-3 py-3">Schedule</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-b border-slate-50"><td className="px-3 py-3">{booking.user?.name || booking.user?.email || booking.userEmail || "Unknown customer"}</td><td className="px-3 py-3 font-medium">{booking.consultant.name}</td><td className="px-3 py-3 text-slate-500">{new Date(booking.date).toLocaleDateString("en-IN")} · {booking.startTime}</td><td className="px-3 py-3">₹{booking.amount} · {booking.providerPaymentId ? "Paid" : "Pending"}</td><td className="px-3 py-3"><select value={booking.status} onChange={(e) => run(() => updateAdminConsultancyBooking(booking.id, e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option>PENDING</option><option>CONFIRMED</option><option>COMPLETED</option><option>CANCELLED</option><option>FAILED</option></select></td></tr>)}</tbody></table>{bookings.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No consultancy bookings yet.</p> : null}</div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Consultants</h2><div className="mt-4 space-y-2">{consultants.map((consultant) => <div key={consultant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="font-medium text-slate-950">{consultant.name}</p><p className="text-xs text-slate-500">{consultant.category.name} · ₹{consultant.hourlyRate}/hr · {consultant.available ? "Available" : "Disabled"}</p></div><div className="flex gap-3"><button type="button" onClick={() => run(() => updateAdminConsultancyConsultant(consultant.id, { available: !consultant.available }))} className="text-xs font-medium text-slate-700 hover:underline">{consultant.available ? "Disable" : "Enable"}</button><button type="button" onClick={() => run(() => deleteAdminConsultancyConsultant(consultant.id))} className="text-xs text-red-600 hover:underline">Delete</button></div></div>)}</div></section>
    </div>
  );
}
