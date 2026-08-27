"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAdminCourse,
  deleteAdminCourse,
  fetchAdminCourses,
  fetchAdminPackages,
  createAdminPackage,
  deleteAdminPackage,
  sendCourseReminders,
  type Course,
  type CoursePackage,
} from "@/lib/api";
import { formatPrice } from "@/lib/courses";
import { useConfirm } from "@/context/ConfirmContext";

export default function AdminCoursesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [creating, setCreating] = useState(false);
  const [pkgTitle, setPkgTitle] = useState("");
  const [pkgPrice, setPkgPrice] = useState("0");
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([fetchAdminCourses(), fetchAdminPackages()]);
      setCourses(c);
      setPackages(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("price", String(Math.round(Number(price) * 100)));
      form.append("published", "false");
      const course = await createAdminCourse(form);
      router.push(`/admin/courses/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim()) return;
    try {
      await createAdminPackage({
        title: pkgTitle.trim(),
        price: Math.round(Number(pkgPrice) * 100),
        published: false,
      });
      setPkgTitle("");
      setPkgPrice("0");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create package failed");
    }
  };

  const handleSendReminders = async () => {
    try {
      const result = await sendCourseReminders();
      setReminderResult(`Sent ${result.sent} reminder(s) (checked ${result.checked})`);
    } catch (err) {
      setReminderResult(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            CMS
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Courses
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSendReminders}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Send expiry reminders
          </button>
          <Link
            href="/admin/certificates"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Certificates
          </Link>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {reminderResult ? (
        <p className="mb-4 text-sm text-slate-600">{reminderResult}</p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">New course</h2>
          <form onSubmit={handleCreateCourse} className="mt-4 space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Course title"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price (INR)"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create course
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">New package</h2>
          <form onSubmit={handleCreatePackage} className="mt-4 space-y-3">
            <input
              value={pkgTitle}
              onChange={(e) => setPkgTitle(e.target.value)}
              placeholder="Package title"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
            <input
              value={pkgPrice}
              onChange={(e) => setPkgPrice(e.target.value)}
              placeholder="Price (INR)"
              type="number"
              min="0"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Create package
            </button>
          </form>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-950">All courses</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Modules</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-950">
                      <Link href={`/admin/courses/${course.id}`} className="hover:underline">
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatPrice(course.price, course.currency)}</td>
                    <td className="px-4 py-3">{course.moduleCount}</td>
                    <td className="px-4 py-3">
                      {course.published ? "Published" : "Draft"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Delete course",
                            message: `Delete "${course.title}"? This cannot be undone.`,
                            confirmLabel: "Delete course",
                            variant: "danger",
                          });
                          if (!confirmed) return;
                          await deleteAdminCourse(course.id);
                          load();
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-950">Packages</h2>
        <div className="mt-4 space-y-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-950">{pkg.title}</p>
                <p className="text-xs text-slate-500">
                  {formatPrice(pkg.price, pkg.currency)} · {pkg.courseCount} courses
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: "Delete package",
                    message: `Delete "${pkg.title}"? This cannot be undone.`,
                    confirmLabel: "Delete package",
                    variant: "danger",
                  });
                  if (!confirmed) return;
                  await deleteAdminPackage(pkg.id);
                  load();
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
