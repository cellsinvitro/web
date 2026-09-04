"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAdminConsultancyConsultant,
  createAdminConsultancySlot,
  deleteAdminConsultancyConsultant,
  deleteAdminConsultancySlot,
  fetchAdminConsultancyBookings,
  fetchAdminConsultancyConsultants,
  updateAdminConsultancyBooking,
  updateAdminConsultancyConsultant,
  type ConsultancyBooking,
  type ConsultancyConsultant,
} from "@/lib/api";
import { AdminSpinner } from "@/components/AdminLoader";

const inputClass = "rounded-xl border border-slate-200 px-3 py-2 text-sm";

type ConsultantEditForm = {
  name: string;
  title: string;
  expertise: string;
  experienceYears: string;
  bio: string;
  consultationTypes: string;
  durationMinutes: string;
  hourlyRate: string;
  available: boolean;
};

export default function AdminConsultancyPage() {
  const [consultants, setConsultants] = useState<ConsultancyConsultant[]>([]);
  const [bookings, setBookings] = useState<ConsultancyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newConsultant, setNewConsultant] = useState({ name: "", title: "", bio: "", rate: "", experience: "" });
  const [consultantImage, setConsultantImage] = useState<File | null>(null);
  const [consultantImagePreview, setConsultantImagePreview] = useState<string | null>(null);
  const consultantImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);
  const [editingConsultant, setEditingConsultant] = useState<ConsultancyConsultant | null>(null);
  const [editForm, setEditForm] = useState<ConsultantEditForm | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [slotForm, setSlotForm] = useState({ consultantId: "", date: "", startTime: "", endTime: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [consultantData, bookingData] = await Promise.all([
        fetchAdminConsultancyConsultants(),
        fetchAdminConsultancyBookings(),
      ]);
      setConsultants(consultantData);
      setBookings(bookingData);
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

  const addConsultant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newConsultant.name.trim()) return;
    await run(async () => {
      await createAdminConsultancyConsultant({
        name: newConsultant.name.trim(),
        title: newConsultant.title.trim(),
        bio: newConsultant.bio.trim(),
        hourlyRate: Math.round(Number(newConsultant.rate) || 0),
        experienceYears: Math.round(Number(newConsultant.experience) || 0),
        image: consultantImage ?? undefined,
      });
      setNewConsultant({ name: "", title: "", bio: "", rate: "", experience: "" });
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

  const openEdit = (consultant: ConsultancyConsultant) => {
    setEditingConsultant(consultant);
    setEditImage(null);
    setEditForm({
      name: consultant.name,
      title: consultant.title ?? "",
      expertise: consultant.expertise.join(", "),
      experienceYears: String(consultant.experienceYears),
      bio: consultant.bio ?? "",
      consultationTypes: consultant.consultationTypes.join(", "),
      durationMinutes: String(consultant.durationMinutes),
      hourlyRate: String(consultant.hourlyRate),
      available: consultant.available,
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditingConsultant(null);
    setEditForm(null);
    setEditImage(null);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingConsultant || !editForm) return;
    setSavingEdit(true);
    setError(null);
    try {
      await updateAdminConsultancyConsultant(editingConsultant.id, {
        name: editForm.name.trim(),
        title: editForm.title.trim(),
        expertise: editForm.expertise.split(",").map((item) => item.trim()).filter(Boolean),
        experienceYears: Number(editForm.experienceYears) || 0,
        bio: editForm.bio.trim(),
        consultationTypes: editForm.consultationTypes.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean),
        durationMinutes: Number(editForm.durationMinutes) || 60,
        hourlyRate: Number(editForm.hourlyRate) || 0,
        available: editForm.available,
        image: editImage ?? undefined,
      });
      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update consultant");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><AdminSpinner size={40} /></div>;

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">CMS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Consultancy</h1>
        <p className="mt-2 text-sm text-slate-500">Manage experts, availability and booking status.</p>
      </div>
      {error ? <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Add consultant</h2>
          <form onSubmit={addConsultant} className="mt-4 grid items-stretch gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <button type="button" onClick={() => consultantImageRef.current?.click()} className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              {consultantImagePreview ? <img src={consultantImagePreview} alt="Consultant preview" className="h-full w-full object-cover" /> : "Click to add consultant image"}
            </button>
            <input ref={consultantImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { setConsultantImage(event.target.files?.[0] ?? null); event.target.value = ""; }} />
            <div className="grid content-center gap-3 sm:grid-cols-2">
              <input required value={newConsultant.name} onChange={(e) => setNewConsultant({ ...newConsultant, name: e.target.value })} placeholder="Full name" className={inputClass} />
              <input value={newConsultant.title} onChange={(e) => setNewConsultant({ ...newConsultant, title: e.target.value })} placeholder="Title / role" className={inputClass} />
              <input type="number" min="0" value={newConsultant.rate} onChange={(e) => setNewConsultant({ ...newConsultant, rate: e.target.value })} placeholder="Hourly rate (INR)" className={inputClass} />
              <input type="number" min="0" value={newConsultant.experience} onChange={(e) => setNewConsultant({ ...newConsultant, experience: e.target.value })} placeholder="Experience (years)" className={inputClass} />
              <textarea value={newConsultant.bio} onChange={(e) => setNewConsultant({ ...newConsultant, bio: e.target.value })} placeholder="Consultant bio" rows={4} className={`${inputClass} sm:col-span-2`} />
              <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Add consultant</button>
            </div>
          </form>
        </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Availability</h2>
        <form onSubmit={addSlot} className="mt-4 grid gap-3 sm:grid-cols-4">
          <select value={slotForm.consultantId} onChange={(e) => setSlotForm({ ...slotForm, consultantId: e.target.value })} className={inputClass}><option value="">Consultant</option>{consultants.map((consultant) => <option key={consultant.id} value={consultant.id}>{consultant.name}</option>)}</select>
          <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className={inputClass} />
          <div className="flex gap-2"><input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className={`${inputClass} min-w-0 flex-1`} /><input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className={`${inputClass} min-w-0 flex-1`} /></div>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add slot</button>
        </form>
        <div className={`mt-5 grid grid-cols-1 gap-3 ${consultants.flatMap((consultant) => consultant.slots).length === 2 ? "md:grid-cols-2" : consultants.flatMap((consultant) => consultant.slots).length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
          {consultants.flatMap((consultant) => consultant.slots.map((slot) => <div key={slot.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span><b>{consultant.name}</b><br /><span className="text-slate-500">{new Date(slot.date).toLocaleDateString("en-IN")} · {slot.startTime} - {slot.endTime}</span></span><span className="flex items-center gap-2">{slot.isBooked ? <span className="text-amber-700">Booked</span> : null}{!slot.isBooked ? <button type="button" onClick={() => run(() => deleteAdminConsultancySlot(slot.id))} className="text-xs text-red-600 hover:underline">Remove</button> : null}</span></div>))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Bookings</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Consultant</th><th className="px-3 py-3">Schedule</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Notes</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-b border-slate-50"><td className="px-3 py-3">{booking.user?.name || booking.user?.email || booking.userEmail || "Unknown customer"}</td><td className="px-3 py-3 font-medium">{booking.consultant.name}</td><td className="px-3 py-3 text-slate-500">{new Date(booking.date).toLocaleDateString("en-IN")} · {booking.startTime}</td><td className="px-3 py-3">₹{booking.amount} · {booking.providerPaymentId ? "Paid" : "Pending"}</td><td className="max-w-xs px-3 py-3 text-xs leading-5 text-slate-600 whitespace-pre-wrap">{booking.notes || <span className="italic text-slate-400">No notes provided</span>}</td><td className="px-3 py-3"><select value={booking.status} onChange={(e) => run(() => updateAdminConsultancyBooking(booking.id, e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option>PENDING</option><option>CONFIRMED</option><option>COMPLETED</option><option>CANCELLED</option><option>FAILED</option></select></td></tr>)}</tbody></table>{bookings.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No consultancy bookings yet.</p> : null}</div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Consultants</h2><div className="mt-4 space-y-2">{consultants.map((consultant) => <div key={consultant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="font-medium text-slate-950">{consultant.name}</p><p className="text-xs text-slate-500">₹{consultant.hourlyRate}/hr · {consultant.available ? "Available" : "Unavailable"}</p></div><div className="flex gap-3"><button type="button" onClick={() => openEdit(consultant)} className="text-xs font-medium text-slate-700 hover:underline">Edit</button><button type="button" onClick={() => run(() => deleteAdminConsultancyConsultant(consultant.id))} className="text-xs text-red-600 hover:underline">Delete</button></div></div>)}</div></section>

      {editingConsultant && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-consultant-title">
          <form onSubmit={saveEdit} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Consultant profile</p><h2 id="edit-consultant-title" className="mt-1 text-xl font-semibold text-slate-950">Edit {editingConsultant.name}</h2></div>
              <button type="button" onClick={closeEdit} className="text-sm text-slate-500 hover:text-slate-950">Close</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-medium text-slate-500">Profile image</span><button type="button" onClick={() => editImageRef.current?.click()} className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">{editImage ? <img src={URL.createObjectURL(editImage)} alt="New consultant preview" className="h-full w-full object-cover" /> : editingConsultant.photoUrl ? <img src={editingConsultant.photoUrl} alt={editingConsultant.name} className="h-full w-full object-cover" /> : "Click to replace image"}</button><input ref={editImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { setEditImage(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
              <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" className={inputClass} />
              <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title / role" className={inputClass} />
              <input value={editForm.expertise} onChange={(e) => setEditForm({ ...editForm, expertise: e.target.value })} placeholder="Expertise, comma separated" className={inputClass} />
              <input type="number" min="0" value={editForm.experienceYears} onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })} placeholder="Experience years" className={inputClass} />
              <input type="number" min="0" value={editForm.hourlyRate} onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })} placeholder="Hourly rate (INR)" className={inputClass} />
              <input type="number" min="1" value={editForm.durationMinutes} onChange={(e) => setEditForm({ ...editForm, durationMinutes: e.target.value })} placeholder="Duration in minutes" className={inputClass} />
              <input value={editForm.consultationTypes} onChange={(e) => setEditForm({ ...editForm, consultationTypes: e.target.value })} placeholder="VIDEO, AUDIO" className={inputClass} />
              <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Consultant bio" rows={4} className={`${inputClass} sm:col-span-2`} />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={editForm.available} onChange={(e) => setEditForm({ ...editForm, available: e.target.checked })} /> Available for new bookings</label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeEdit} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button disabled={savingEdit} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingEdit ? "Saving..." : "Save changes"}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
