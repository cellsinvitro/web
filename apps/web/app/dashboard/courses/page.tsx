"use client";

import Link from "next/link";
import EnrolledCoursesList from "@/components/dashboard/EnrolledCoursesList";

export default function DashboardCoursesPage() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Learning
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            My courses
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track progress, complete modules, and earn certificates.
          </p>
        </div>
        <Link
          href="/courses"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          Browse catalog
        </Link>
      </div>

      <EnrolledCoursesList />

      <div className="mt-8">
        <Link
          href="/dashboard/certificates"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          View my certificates →
        </Link>
      </div>
    </div>
  );
}
