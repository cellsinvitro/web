"use client";

import React from "react";
import AdminLmsTab from "@/components/admin/AdminLmsTab";

export default function AdminLmsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Admin Command Center</span>
          <span>•</span>
          <span className="text-amber-600 font-bold">LMS & CryoSearch</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          LMS Banner &amp; Pricing
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Edit the LMS Suite banner, configure module subscription prices and bundle discounts, and inspect payments.
        </p>
      </div>

      <AdminLmsTab />
    </div>
  );
}
