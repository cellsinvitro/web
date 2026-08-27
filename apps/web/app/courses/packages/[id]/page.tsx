"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PurchaseButton from "@/components/courses/PurchaseButton";
import { useAuth } from "@/context/AuthContext";
import { fetchPublicPackage, type CoursePackage } from "@/lib/api";
import { formatPrice } from "@/lib/courses";

export default function PackageDetailPage() {
  const params = useParams();
  const packageId = params.id as string;
  const { user } = useAuth();
  const [pkg, setPkg] = useState<CoursePackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicPackage(packageId)
      .then(setPkg)
      .finally(() => setLoading(false));
  }, [packageId]);

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

  if (!pkg) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50 px-5 py-12">
          <p className="text-sm text-red-600">Package not found.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-950">
            ← All courses
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {pkg.title}
          </h1>
          <p className="mt-3 text-slate-600">{pkg.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>{formatPrice(pkg.price, pkg.currency)}</span>
            <span>{pkg.accessDurationDays} days access</span>
            <span>{pkg.courseCount} courses</span>
          </div>

          <div className="mt-8">
            {user ? (
              <PurchaseButton packageId={pkg.id} label="Purchase package" />
            ) : (
              <Link
                href="/login"
                className="inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Sign in to purchase
              </Link>
            )}
          </div>

          {pkg.courses && pkg.courses.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-950">Included courses</h2>
              <ul className="mt-4 space-y-2">
                {pkg.courses.map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`/courses/${course.id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 hover:bg-slate-50"
                    >
                      {course.title}
                      {course.category ? (
                        <span className="ml-2 text-xs text-slate-400">{course.category}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
