"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyEnrollments, type Enrollment } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";

export default function EnrolledCoursesList({ limit }: { limit?: number }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyEnrollments();
      setEnrollments(limit ? data.slice(0, limit) : data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Loading courses…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">You haven&apos;t enrolled in any courses yet.</p>
        <Link
          href="/courses"
          className="mt-3 inline-flex text-sm font-medium text-slate-950 hover:underline"
        >
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {enrollments.map((enrollment) => (
        <Link
          key={enrollment.id}
          href={`/dashboard/courses/${enrollment.course.id}`}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-950 group-hover:text-slate-800">
                {enrollment.course.title}
              </p>
              {enrollment.course.category ? (
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                  {enrollment.course.category}
                </p>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                enrollment.status === "COMPLETED"
                  ? "bg-green-100 text-green-800"
                  : enrollment.status === "EXPIRED"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {enrollment.status}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{enrollment.progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-950 transition-all"
                style={{ width: `${enrollment.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Expires {formatCourseDate(enrollment.expiresAt)}</span>
            <span>
              {enrollment.completedModules}/{enrollment.totalModules} modules
            </span>
            {enrollment.certificate ? (
              <span className="text-green-700">Certified</span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
