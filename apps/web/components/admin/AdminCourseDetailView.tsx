"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  addCoursePrerequisite,
  deleteAdminModule,
  fetchAdminCourse,
  fetchAdminCourses,
  fetchAdminCourseEnrollments,
  removeCoursePrerequisite,
  reorderAdminModules,
  updateAdminCourse,
  type Course,
  type CourseModule,
} from "@/lib/api";
import {
  formatDuration,
  getModuleTypeLabel,
  REMINDER_MODES,
} from "@/lib/courses";
import { useConfirm } from "@/context/ConfirmContext";
import AdminModuleForm from "@/components/admin/AdminModuleForm";

const MODULE_TYPE_COLORS: Record<string, string> = {
  VIDEO: "bg-violet-100 text-violet-700",
  PDF: "bg-red-100 text-red-700",
  PPT: "bg-orange-100 text-orange-700",
  TEXT: "bg-sky-100 text-sky-700",
  IMAGE: "bg-emerald-100 text-emerald-700",
  ASSIGNMENT: "bg-amber-100 text-amber-700",
  QUIZ: "bg-pink-100 text-pink-700",
};

function TypeBadge({ type }: { type: string }) {
  const color = MODULE_TYPE_COLORS[type] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${color}`}>
      {getModuleTypeLabel(type)}
    </span>
  );
}

export default function AdminCourseDetailPage({ courseId }: { courseId: string }) {
  const confirm = useConfirm();
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<
    Awaited<ReturnType<typeof fetchAdminCourseEnrollments>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"modules" | "settings" | "enrollments">("modules");
  const [prereqId, setPrereqId] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [c, all, enr] = await Promise.all([
        fetchAdminCourse(courseId),
        fetchAdminCourses(),
        fetchAdminCourseEnrollments(courseId),
      ]);
      setCourse(c);
      setAllCourses(all.filter((x) => x.id !== courseId));
      setEnrollments(enr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!course) return;
    setSaveStatus("saving");
    const form = new FormData(e.currentTarget);
    const priceDisplay = String(form.get("priceDisplay") ?? "0");
    form.set("price", String(Math.round(Number(priceDisplay) * 100)));
    if (!e.currentTarget.querySelector<HTMLInputElement>('input[name="published"]')?.checked) {
      form.set("published", "false");
    }
    try {
      await updateAdminCourse(courseId, form);
      await load({ silent: true });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  };

  const handleReorder = async (moduleId: string, direction: "up" | "down") => {
    if (!course?.modules) return;
    const ids = [...course.modules].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.id);
    const idx = ids.indexOf(moduleId);
    if (direction === "up" && idx > 0) {
      const current = ids[idx];
      const prev = ids[idx - 1];
      if (current && prev) ids.splice(idx - 1, 2, current, prev);
    } else if (direction === "down" && idx < ids.length - 1) {
      const current = ids[idx];
      const next = ids[idx + 1];
      if (current && next) ids.splice(idx, 2, next, current);
    } else return;
    await reorderAdminModules(courseId, ids);
    load({ silent: true });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading course…
      </div>
    );
  }
  if (error || !course) return <p className="text-sm text-red-600">{error || "Not found"}</p>;

  const sortedModules = [...(course.modules ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-700"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
        Courses
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{course.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {course.category && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {course.category}
              </span>
            )}
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${course.published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {course.published ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-slate-400">{sortedModules.length} modules</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {(["modules", "settings", "enrollments"] as const).map((t) => {
            const labels: Record<typeof t, string> = {
              modules: "Modules",
              settings: "Settings",
              enrollments: "Enrollments",
            };
            const badges: Record<typeof t, number | null> = {
              modules: sortedModules.length || null,
              settings: null,
              enrollments: enrollments.length || null,
            };
            const icons: Record<typeof t, React.ReactNode> = {
              modules: (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v2.5A2.25 2.25 0 0115.75 9h-11.5A2.25 2.25 0 012 6.75v-2.5zM2 11.25A2.25 2.25 0 014.25 9h11.5A2.25 2.25 0 0118 11.25v2.5A2.25 2.25 0 0115.75 16h-11.5A2.25 2.25 0 012 13.75v-2.5z" />
                </svg>
              ),
              settings: (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.31 1.768a6.03 6.03 0 011.442.83l1.684-.594a1 1 0 011.17.437l1.18 2.044a1 1 0 01-.23 1.255l-1.372 1.072a6.1 6.1 0 010 1.68l1.372 1.072a1 1 0 01.23 1.255l-1.18 2.044a1 1 0 01-1.17.437l-1.684-.594a6.03 6.03 0 01-1.443.83l-.31 1.768a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.31-1.768a6.03 6.03 0 01-1.443-.83l-1.684.594a1 1 0 01-1.17-.437l-1.18-2.044a1 1 0 01.23-1.255l1.372-1.072a6.1 6.1 0 010-1.68L2.285 7.148a1 1 0 01-.23-1.255L3.235 3.85a1 1 0 011.17-.437l1.684.594a6.03 6.03 0 011.443-.83l.31-1.768zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              ),
              enrollments: (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
                </svg>
              ),
            };
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
                  active
                    ? "border-slate-950 text-slate-950"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {icons[t]}
                {labels[t]}
                {badges[t] !== null && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                    active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {badges[t]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── MODULES TAB ── */}
      {tab === "modules" ? (
        <div className="mt-6 space-y-5">
          {/* Add module card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <svg className="h-4 w-4 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">Add module</h2>
                <p className="text-xs text-slate-500">Video, PDF, PowerPoint, text, image, assignment, or quiz</p>
              </div>
            </div>
            <AdminModuleForm courseId={courseId} onSaved={() => load({ silent: true })} />
          </div>

          {/* Module list */}
          {sortedModules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No modules yet</p>
              <p className="mt-1 text-xs text-slate-400">Add your first module using the form above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedModules.map((module, i) => (
                <ModuleRow
                  key={module.id}
                  module={module}
                  index={i}
                  total={sortedModules.length}
                  courseId={courseId}
                  onReorder={handleReorder}
                  onDelete={async () => {
                    const confirmed = await confirm({
                      title: "Delete module",
                      message: "Delete this module? This cannot be undone.",
                      confirmLabel: "Delete module",
                      variant: "danger",
                    });
                    if (!confirmed) return;
                    await deleteAdminModule(courseId, module.id);
                    load();
                  }}
                  onRefresh={load}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" ? (
        <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
          {/* Row 1: Identity + Pricing side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Identity */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-950">Course identity</h2>
                <p className="mt-0.5 text-xs text-slate-500">How the course appears to learners</p>
              </div>
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Title</span>
                  <input
                    name="title"
                    defaultValue={course.title}
                    required
                    placeholder="Course title"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Category</span>
                  <input
                    name="category"
                    defaultValue={course.category ?? ""}
                    placeholder="e.g. Cell biology"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Description</span>
                  <textarea
                    name="description"
                    defaultValue={course.description ?? ""}
                    rows={5}
                    placeholder="Describe what learners will gain from this course…"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                </label>
              </div>
            </section>

            {/* Pricing & Access */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-950">Pricing & access</h2>
                <p className="mt-0.5 text-xs text-slate-500">Control cost, availability, and completion rules</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Price (INR)</span>
                    <input
                      name="priceDisplay"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(course.price / 100).toFixed(2)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Access (days)</span>
                    <input
                      name="accessDurationDays"
                      type="number"
                      min="1"
                      defaultValue={course.accessDurationDays}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Passing score (%)</span>
                    <input
                      name="passingPercentage"
                      type="number"
                      min="1"
                      max="100"
                      defaultValue={course.passingPercentage}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Reminder mode</span>
                    <select
                      name="reminderMode"
                      defaultValue={course.reminderMode ?? "AUTOMATIC"}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                    >
                      {REMINDER_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Published toggle */}
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Publish course</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Make this course visible and purchasable by learners
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="published"
                      value="true"
                      defaultChecked={course.published}
                      className="h-4 w-4 rounded accent-slate-950"
                    />
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Row 2: Prerequisites — full width */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="font-semibold text-slate-950">Prerequisites</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Learners must complete these courses and earn a certificate before purchasing this one
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={prereqId}
                onChange={(e) => setPrereqId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 sm:min-w-[280px]"
              >
                <option value="">Select a course to add as prerequisite…</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (!prereqId) return;
                  await addCoursePrerequisite(courseId, prereqId);
                  setPrereqId("");
                  load();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Add
              </button>
            </div>
            {(course.prerequisites ?? []).length > 0 ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(course.prerequisites ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
                  >
                    <span className="truncate font-medium text-slate-700">{p.title}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeCoursePrerequisite(courseId, p.id);
                        load();
                      }}
                      className="shrink-0 text-xs text-red-500 transition-colors hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-400">No prerequisites set — this course is open to all learners.</p>
            )}
          </section>

          {/* Save bar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-slate-400">Changes apply immediately to the learner-facing course page.</p>
            <button
              type="submit"
              disabled={saveStatus === "saving"}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                saveStatus === "saved"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-950 text-white hover:bg-slate-800"
              }`}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "Save settings"}
            </button>
          </div>
        </form>
      ) : null}

      {/* ── ENROLLMENTS TAB ── */}
      {tab === "enrollments" ? (
        <div className="mt-6">
          {enrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No enrollments yet</p>
              <p className="mt-1 text-xs text-slate-400">Learners who purchase this course will appear here</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Learner</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Expires</th>
                    <th className="px-5 py-3">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrollments.map((e) => {
                    const now = Date.now();
                    const expires = new Date(e.expiresAt).getTime();
                    const daysLeft = Math.ceil((expires - now) / 86400000);
                    const isExpired = daysLeft < 0;
                    const isExpiringSoon = !isExpired && daysLeft <= 14;

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-900">{e.user.name || e.user.email}</p>
                          {e.user.name && (
                            <p className="mt-0.5 text-xs text-slate-400">{e.user.email}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-800 transition-all"
                                style={{ width: `${e.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-slate-500">{e.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {isExpired ? (
                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                              Expired
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {daysLeft}d left
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {new Date(e.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {e.hasCertificate ? (
                            <span className="font-mono text-slate-700">{e.certificateNumber}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ModuleRow({
  module,
  index,
  total,
  courseId,
  onReorder,
  onDelete,
  onRefresh,
}: {
  module: CourseModule;
  index: number;
  total: number;
  courseId: string;
  onReorder: (id: string, dir: "up" | "down") => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Index */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500">
          {index + 1}
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-950">{module.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TypeBadge type={module.contentType} />
            {module.durationMinutes ? (
              <span className="text-xs text-slate-400">{formatDuration(module.durationMinutes)}</span>
            ) : null}
            {module.fileName ? (
              <span className="max-w-[160px] truncate text-xs text-slate-400" title={module.fileName}>
                {module.fileName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onReorder(module.id, "up")}
            disabled={index === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            title="Move up"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 011.06 0l4.25 4.25a.75.75 0 11-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 01-1.06-1.06l4.25-4.25z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onReorder(module.id, "down")}
            disabled={index === total - 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
            title="Move down"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.53 13.53a.75.75 0 01-1.06 0l-4.25-4.25a.75.75 0 111.06-1.06L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="mx-1 h-4 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              editing
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-4">
          <AdminModuleForm
            courseId={courseId}
            existing={module}
            onSaved={() => {
              setEditing(false);
              onRefresh();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
