"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PurchaseButton from "@/components/courses/PurchaseButton";
import { useAuth } from "@/context/AuthContext";
import {
  fetchCourseAccess,
  fetchPublicCourse,
  type Course,
} from "@/lib/api";
import { formatPrice, getModuleTypeLabel } from "@/lib/courses";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [access, setAccess] = useState<{
    enrolled: boolean;
    locked: boolean;
    prerequisitesMet: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicCourse(courseId)
      .then(setCourse)
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (user) {
      fetchCourseAccess(courseId)
        .then((data) => setAccess(data))
        .catch(() => setAccess(null));
    }
  }, [user, courseId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50 px-5 py-12">
          <p className="text-sm text-slate-500">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50 px-5 py-12">
          <p className="text-sm text-red-600">Course not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  const canPurchase = !access?.enrolled && access?.prerequisitesMet !== false;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
          {course.thumbnailUrl ? (
            <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-100 sm:h-64">
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}

          <div className="mt-6">
            {course.category ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                {course.category}
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {course.title}
            </h1>
            <p className="mt-3 text-slate-600">{course.description}</p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
              <span>{formatPrice(course.price, course.currency)}</span>
              <span>{course.accessDurationDays} days access</span>
              <span>Pass: {course.passingPercentage}%</span>
              <span>{course.modules?.length ?? course.moduleCount} modules</span>
            </div>

            {course.prerequisites && course.prerequisites.length > 0 ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Prerequisites</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {course.prerequisites.map((p) => (
                    <li key={p.id}>
                      <Link href={`/courses/${p.courseId}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                {access?.locked ? (
                  <p className="mt-2 text-sm text-amber-800">
                    Complete prerequisite courses to unlock enrollment.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8">
              {access?.enrolled ? (
                <Link
                  href={`/dashboard/courses/${courseId}`}
                  className="inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Continue learning
                </Link>
              ) : user ? (
                canPurchase ? (
                  <PurchaseButton courseId={courseId} />
                ) : (
                  <p className="text-sm text-amber-800">
                    Complete prerequisites before enrolling.
                  </p>
                )
              ) : (
                <Link
                  href="/login"
                  className="inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Sign in to enroll
                </Link>
              )}
            </div>

            {course.modules && course.modules.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-slate-950">Course outline</h2>
                <ol className="mt-4 space-y-2">
                  {course.modules.map((module, i) => (
                    <li
                      key={module.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 font-medium text-slate-950">
                        {module.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {getModuleTypeLabel(module.contentType)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
