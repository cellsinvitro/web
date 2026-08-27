"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  addCoursePrerequisite,
  createAdminModule,
  deleteAdminModule,
  fetchAdminCourse,
  fetchAdminCourses,
  fetchAdminCourseEnrollments,
  removeCoursePrerequisite,
  reorderAdminModules,
  updateAdminCourse,
  updateAdminModule,
  type Course,
  type CourseModule,
} from "@/lib/api";
import {
  buildDefaultAssignmentJson,
  buildDefaultQuizJson,
  getModuleTypeLabel,
  MODULE_CONTENT_TYPES,
  REMINDER_MODES,
} from "@/lib/courses";

export default function AdminCourseDetailPage({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<
    Awaited<ReturnType<typeof fetchAdminCourseEnrollments>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"modules" | "settings" | "enrollments">("modules");

  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleType, setModuleType] = useState("VIDEO");
  const [moduleFile, setModuleFile] = useState<File | null>(null);
  const [prereqId, setPrereqId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
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
    const form = new FormData(e.currentTarget);
    form.set("title", course.title);
    const priceDisplay = String(form.get("priceDisplay") ?? "0");
    form.set("price", String(Math.round(Number(priceDisplay) * 100)));
    if (!e.currentTarget.querySelector<HTMLInputElement>('input[name="published"]')?.checked) {
      form.set("published", "false");
    }
    await updateAdminCourse(courseId, form);
    load();
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    const form = new FormData();
    form.append("title", moduleTitle.trim());
    form.append("contentType", moduleType);
    if (moduleType === "QUIZ") form.append("contentJson", buildDefaultQuizJson(10));
    if (moduleType === "ASSIGNMENT") form.append("contentJson", buildDefaultAssignmentJson());
    if (moduleFile && ["VIDEO", "PDF", "PPT"].includes(moduleType)) {
      form.append("file", moduleFile);
    }
    await createAdminModule(courseId, form);
    setModuleTitle("");
    setModuleFile(null);
    load();
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
    load();
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error || !course) return <p className="text-sm text-red-600">{error || "Not found"}</p>;

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-slate-500 hover:text-slate-950">
        ← Courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-950">{course.title}</h1>

      <div className="mt-6 flex gap-2">
        {(["modules", "settings", "enrollments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "modules" ? (
        <div className="mt-6 space-y-6">
          <form onSubmit={handleAddModule} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-950">Add module</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="Module title"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              />
              <select
                value={moduleType}
                onChange={(e) => setModuleType(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              >
                {MODULE_CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {["VIDEO", "PDF", "PPT"].includes(moduleType) ? (
                <input
                  type="file"
                  onChange={(e) => setModuleFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
              ) : null}
            </div>
            <button type="submit" className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Add module
            </button>
          </form>

          <div className="space-y-2">
            {(course.modules ?? []).map((module, i) => (
              <ModuleRow
                key={module.id}
                module={module}
                index={i}
                courseId={courseId}
                onReorder={handleReorder}
                onDelete={async () => {
                  if (confirm("Delete module?")) {
                    await deleteAdminModule(courseId, module.id);
                    load();
                  }
                }}
                onRefresh={load}
              />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <form onSubmit={handleSaveSettings} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <input name="title" type="hidden" value={course.title} />
          <label className="block text-sm">
            <span className="text-slate-500">Description</span>
            <textarea
              name="description"
              defaultValue={course.description ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Category</span>
            <input
              name="category"
              defaultValue={course.category ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Price (INR)</span>
            <input
              name="priceDisplay"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(course.price / 100).toFixed(2)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Access days</span>
            <input
              name="accessDurationDays"
              type="number"
              defaultValue={course.accessDurationDays}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Passing %</span>
            <input
              name="passingPercentage"
              type="number"
              defaultValue={course.passingPercentage}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Reminder mode</span>
            <select
              name="reminderMode"
              defaultValue={course.reminderMode ?? "AUTOMATIC"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            >
              {REMINDER_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              value="true"
              defaultChecked={course.published}
            />
            Published
          </label>
          <div>
            <p className="text-sm font-medium text-slate-950">Prerequisites</p>
            <div className="mt-2 flex gap-2">
              <select
                value={prereqId}
                onChange={(e) => setPrereqId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select course…</option>
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
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                Add
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {(course.prerequisites ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.title}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeCoursePrerequisite(courseId, p.id);
                      load();
                    }}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Save settings
          </button>
        </form>
      ) : null}

      {tab === "enrollments" ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Cert</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{e.user.name || e.user.email}</p>
                    <p className="text-xs text-slate-500">{e.user.email}</p>
                  </td>
                  <td className="px-4 py-3">{e.progressPercent}%</td>
                  <td className="px-4 py-3 text-xs">{new Date(e.expiresAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.hasCertificate ? e.certificateNumber : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ModuleRow({
  module,
  index,
  courseId,
  onReorder,
  onDelete,
  onRefresh,
}: {
  module: CourseModule;
  index: number;
  courseId: string;
  onReorder: (id: string, dir: "up" | "down") => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [quizJson, setQuizJson] = useState(
    module.contentType === "QUIZ" ? JSON.stringify(module.contentJson, null, 2) : ""
  );

  const saveQuiz = async () => {
    const form = new FormData();
    form.append("contentJson", quizJson);
    await updateAdminModule(courseId, module.id, form);
    setEditing(false);
    onRefresh();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-950">
            {index + 1}. {module.title}
          </p>
          <p className="text-xs text-slate-500">{getModuleTypeLabel(module.contentType)}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onReorder(module.id, "up")} className="text-xs text-slate-500">↑</button>
          <button type="button" onClick={() => onReorder(module.id, "down")} className="text-xs text-slate-500">↓</button>
          {module.contentType === "QUIZ" ? (
            <button type="button" onClick={() => setEditing(!editing)} className="text-xs text-slate-600">Edit quiz</button>
          ) : null}
          <button type="button" onClick={onDelete} className="text-xs text-red-600">Delete</button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3">
          <textarea
            value={quizJson}
            onChange={(e) => setQuizJson(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
          />
          <button type="button" onClick={saveQuiz} className="mt-2 text-sm font-medium">Save quiz JSON</button>
        </div>
      ) : null}
    </div>
  );
}
