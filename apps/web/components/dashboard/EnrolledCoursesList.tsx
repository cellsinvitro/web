"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyEnrollments, type Enrollment } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";

export default function EnrolledCoursesList({
  limit,
  compact = false,
}: {
  limit?: number;
  compact?: boolean;
}) {
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
      <div
        className={`rounded-xl border border-dashed border-slate-200 text-center ${
          compact ? "px-4 py-5" : "p-8"
        }`}
      >
        <p className="text-sm text-slate-500">You haven&apos;t enrolled in any courses yet.</p>
        <Link
          href="/courses"
          className="mt-2 inline-flex text-sm font-medium text-slate-950 hover:underline"
        >
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      {enrollments.map((enrollment) => (
        <Link
          key={enrollment.id}
          href={`/dashboard/courses/${enrollment.course.id}`}
          className={`group rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${
            compact ? "p-3" : "p-5"
          }`}
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

          <div className={compact ? "mt-2.5" : "mt-4"}>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{enrollment.progressPercent}%</span>
            </div>
            <div className={`rounded-full bg-slate-100 ${compact ? "mt-1 h-1.5" : "mt-1.5 h-2"}`}>
              <div
                className={`rounded-full bg-slate-950 transition-all ${compact ? "h-1.5" : "h-2"}`}
                style={{ width: `${enrollment.progressPercent}%` }}
              />
            </div>
          </div>

          <div
            className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 ${
              compact ? "mt-2.5" : "mt-4"
            }`}
          >
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
