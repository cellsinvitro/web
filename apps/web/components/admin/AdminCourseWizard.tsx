"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminCourse, fetchAdminCourse, type Course } from "@/lib/api";
import { ACCESS_DURATION_PRESETS, getModuleTypeLabel } from "@/lib/courses";
import AdminModuleForm from "@/components/admin/AdminModuleForm";

export default function AdminCourseWizard({
  onFinished,
}: {
  onFinished?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [accessDurationDays, setAccessDurationDays] = useState("90");
  const [passingPercentage, setPassingPercentage] = useState("75");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Course title is required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("category", category.trim());
      form.append("price", String(Math.round(Number(price) * 100)));
      form.append("accessDurationDays", accessDurationDays);
      form.append("passingPercentage", passingPercentage);
      form.append("published", "false");
      if (thumbnail) form.append("thumbnail", thumbnail);
      const created = await createAdminCourse(form);
      setCourse(created);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const finish = () => {
    onFinished?.();
    if (course) router.push(`/admin/courses/${course.id}`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">New course</h2>
          <p className="mt-1 text-sm text-slate-500">
            {step === 1
              ? "Set title, price, and access. Next, add videos, PDFs, text, images, quizzes, and assignments."
              : "Add modules in any order. Learners complete them at their own pace after payment."}
          </p>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Step {step} of 2
        </p>
      </div>

      <ol className="mt-4 flex gap-2 text-xs font-medium">
        <li className={`rounded-full px-3 py-1 ${step === 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
          1. Details
        </li>
        <li className={`rounded-full px-3 py-1 ${step === 2 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
          2. Modules
        </li>
      </ol>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {step === 1 ? (
        <form onSubmit={handleNext} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm sm:col-span-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm sm:col-span-2"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Cell culture)"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (INR)"
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
          <label className="text-sm">
            <span className="text-slate-500">Access duration</span>
            <select
              value={ACCESS_DURATION_PRESETS.map(String).includes(accessDurationDays) ? accessDurationDays : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") setAccessDurationDays(e.target.value);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            >
              {ACCESS_DURATION_PRESETS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Days (custom)</span>
            <input
              value={accessDurationDays}
              onChange={(e) => setAccessDurationDays(e.target.value)}
              type="number"
              min="1"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Passing score (%)</span>
            <input
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(e.target.value)}
              type="number"
              min="1"
              max="100"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Thumbnail</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Creating…" : "Next"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-6">
          <p className="text-sm text-slate-600">
            Course draft: <span className="font-medium text-slate-950">{course?.title}</span>
          </p>
          <AdminModuleForm
            courseId={course!.id}
            onSaved={async () => {
              if (!course) return;
              const updated = await fetchAdminCourse(course.id);
              setCourse(updated);
              onFinished?.();
            }}
          />
          {(course?.modules ?? []).length > 0 ? (
            <ul className="space-y-2 text-sm">
              {course?.modules?.map((module, i) => (
                <li key={module.id} className="rounded-xl border border-slate-100 px-3 py-2">
                  {i + 1}. {module.title} · {getModuleTypeLabel(module.contentType)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Add modules such as 15-minute videos, a PDF/PPT, an image or text lesson, a short-note assignment, and a 10-question test.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={finish}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Finish & edit course
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
