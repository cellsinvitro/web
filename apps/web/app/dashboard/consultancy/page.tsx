"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchConsultancyCategories,
  fetchConsultancyConsultants,
  fetchMyConsultancyBookings,
  type ConsultancyCategory,
  type ConsultancyConsultant,
  type ConsultancyBooking,
} from "@/lib/api";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default function DashboardConsultancyPage() {
  const [categories, setCategories] = useState<ConsultancyCategory[]>([]);
  const [consultants, setConsultants] = useState<ConsultancyConsultant[]>([]);
  const [bookings, setBookings] = useState<ConsultancyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [categoryData, consultantData, bookingData] = await Promise.all([
          fetchConsultancyCategories(),
          fetchConsultancyConsultants(),
          fetchMyConsultancyBookings(),
        ]);
        setCategories(categoryData);
        setConsultants(consultantData);
        setBookings(bookingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load consultancy data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredConsultants = useMemo(() => {
    if (categoryFilter === "all") return consultants;
    return consultants.filter((consultant) => consultant.categoryId === categoryFilter);
  }, [categories, categoryFilter, consultants]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-52 rounded-xl bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Consultancy</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Connect with expert guidance</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Browse specialist consultants, review availability, and secure a session with a researcher or scientific advisor.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              categoryFilter === "all" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryFilter(category.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                categoryFilter === category.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {error ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredConsultants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              No consultants are available in this category right now.
            </div>
          ) : (
            filteredConsultants.map((consultant) => (
              <article key={consultant.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-40 bg-gradient-to-br from-slate-100 to-emerald-50 p-5">
                  {consultant.photoUrl ? (
                    <img src={consultant.photoUrl} alt={consultant.name} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900 text-xl font-semibold text-white">
                      {consultant.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? "")
                        .join("")}
                    </div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{consultant.name}</h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-700">
                        {consultant.available ? "Available" : "Offline"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{consultant.title || consultant.category.name}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {consultant.expertise.slice(0, 3).map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-2 py-1">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{consultant.experienceYears}+ years</span>
                    <span className="font-semibold text-slate-950">₹{consultant.hourlyRate}/hr</span>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/dashboard/consultancy/${consultant.id}`}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      View profile
                    </Link>
                    <Link
                      href={`/dashboard/consultancy/${consultant.id}`}
                      className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Book now
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">My bookings</h2>
            <p className="mt-1 text-sm text-slate-500">Track your session history and payment status.</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              You haven’t booked a consultancy session yet.
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{booking.consultant.name}</p>
                  <p className="text-sm text-slate-500">
                    {booking.consultationType} · {formatDate(booking.date)} · {booking.startTime} to {booking.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 font-medium text-slate-700">{booking.status}</span>
                  <span className="text-slate-500">₹{booking.amount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
