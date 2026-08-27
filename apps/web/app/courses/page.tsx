"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { fetchCourseCatalog, type Course, type CoursePackage } from "@/lib/api";
import { formatPrice } from "@/lib/courses";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseCatalog()
      .then((data) => {
        setCourses(data.courses);
        setPackages(data.packages);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-24 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Learning
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Certified Courses
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Self-paced, payment-gated courses in cell culture and molecular biology.
            Complete modules, pass assessments, and earn verifiable certificates.
          </p>

          {loading ? (
            <p className="mt-10 text-sm text-slate-500">Loading catalog…</p>
          ) : (
            <>
              {packages.length > 0 ? (
                <section className="mt-10">
                  <h2 className="text-lg font-semibold text-slate-950">Course packages</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => (
                      <Link
                        key={pkg.id}
                        href={`/courses/packages/${pkg.id}`}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <p className="font-semibold text-slate-950">{pkg.title}</p>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {pkg.description || `${pkg.courseCount} courses bundled`}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-slate-950">
                          {formatPrice(pkg.price, pkg.currency)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-10">
                <h2 className="text-lg font-semibold text-slate-950">Individual courses</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      {course.thumbnailUrl ? (
                        <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-slate-100">
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-40 rounded-t-2xl bg-slate-100" />
                      )}
                      <div className="p-5">
                        {course.category ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {course.category}
                          </p>
                        ) : null}
                        <p className="mt-1 font-semibold text-slate-950">{course.title}</p>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-950">
                            {formatPrice(course.price, course.currency)}
                          </span>
                          <span className="text-slate-500">
                            {course.moduleCount} modules · {course.accessDurationDays}d access
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {courses.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No courses published yet.</p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
