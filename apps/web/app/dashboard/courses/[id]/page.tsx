"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CoursePlayer from "@/components/courses/CoursePlayer";
import { fetchMyCourse } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";

export default function DashboardCourseLearnPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMyCourse>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyCourse(courseId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="px-5 py-8">
        <p className="text-sm text-slate-500">Loading course…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-5 py-8">
        <p className="text-sm text-red-600">{error || "Course not found"}</p>
        <Link href="/dashboard/courses" className="mt-2 text-sm text-slate-600 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <Link
        href="/dashboard/courses"
        className="text-sm text-slate-500 hover:text-slate-950"
      >
        ← My courses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {data.course.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Access until {formatCourseDate(data.enrollment.expiresAt)} ·{" "}
            {data.enrollment.progressPercent}% complete
          </p>
        </div>
        {data.certificate ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm">
            <p className="font-medium text-green-900">Certificate earned</p>
            <p className="text-green-700">{data.certificate.certificateNumber}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-950 transition-all"
          style={{ width: `${data.enrollment.progressPercent}%` }}
        />
      </div>

      <div className="mt-8">
        <CoursePlayer
          course={data.course}
          moduleProgress={data.moduleProgress}
          onProgressUpdate={load}
        />
      </div>
    </div>
  );
}
