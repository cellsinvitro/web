"use client";

import { useState } from "react";
import { createAdminModule, updateAdminModule, type CourseModule } from "@/lib/api";
import {
  MODULE_CONTENT_TYPES,
  moduleAcceptsFile,
  moduleFileAccept,
  parseAssignmentJson,
  parseTextBody,
} from "@/lib/courses";
import QuizBuilder, {
  questionsFromContentJson,
  serializeQuizQuestions,
  type QuizQuestionDraft,
} from "@/components/admin/QuizBuilder";

export default function AdminModuleForm({
  courseId,
  existing,
  onSaved,
  onCancel,
}: {
  courseId: string;
  existing?: CourseModule;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [contentType, setContentType] = useState(existing?.contentType ?? "VIDEO");
  const [durationMinutes, setDurationMinutes] = useState(
    existing?.durationMinutes != null ? String(existing.durationMinutes) : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [textBody, setTextBody] = useState(parseTextBody(existing?.contentJson));
  const assignment = parseAssignmentJson(existing?.contentJson);
  const [instructions, setInstructions] = useState(assignment.instructions);
  const [minWords, setMinWords] = useState(String(assignment.minWords ?? 50));
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(
    questionsFromContentJson(existing?.contentType === "QUIZ" ? existing.contentJson : null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLocked = Boolean(existing);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Module title is required");
      return;
    }
    if (moduleAcceptsFile(contentType) && !existing && !file) {
      setError("Please choose a file to upload");
      return;
    }
    if (contentType === "TEXT" && !textBody.trim()) {
      setError("Enter the text content for this module");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("description", description.trim());
      if (!existing) form.append("contentType", contentType);
      if (durationMinutes) form.append("durationMinutes", durationMinutes);
      if (file && moduleAcceptsFile(contentType)) form.append("file", file);
      if (contentType === "TEXT") {
        form.append("contentJson", JSON.stringify({ body: textBody }));
      }
      if (contentType === "ASSIGNMENT") {
        form.append(
          "contentJson",
          JSON.stringify({
            instructions: instructions.trim() || "Write a short note on this topic.",
            minWords: Number(minWords) || 50,
          })
        );
      }
      if (contentType === "QUIZ") {
        form.append("contentJson", serializeQuizQuestions(questions));
      }

      if (existing) {
        await updateAdminModule(courseId, existing.id, form);
      } else {
        await createAdminModule(courseId, form);
        setTitle("");
        setDescription("");
        setDurationMinutes("");
        setFile(null);
        setTextBody("");
        setInstructions("Write a short note on the topic covered in this module.");
        setMinWords("50");
        setQuestions(questionsFromContentJson(null));
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Module title"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        />
        {typeLocked ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            {MODULE_CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType}
          </div>
        ) : (
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            {MODULE_CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm sm:col-span-2"
        />
        <input
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="Duration in minutes (optional)"
          type="number"
          min="0"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
        />
      </div>

      {moduleAcceptsFile(contentType) ? (
        <label className="block text-sm">
          <span className="text-slate-500">
            {contentType === "VIDEO"
              ? "Upload video (MP4, WebM, MOV — view only, not downloadable)"
              : contentType === "IMAGE"
                ? "Upload image (JPEG, PNG, WebP, GIF)"
                : contentType === "PDF"
                  ? "Upload PDF"
                  : "Upload PowerPoint (.ppt, .pptx)"}
          </span>
          <input
            type="file"
            accept={moduleFileAccept(contentType)}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
          {existing?.fileName ? (
            <span className="mt-1 block text-xs text-slate-400">
              Current file: {existing.fileName}
            </span>
          ) : null}
        </label>
      ) : null}

      {contentType === "TEXT" ? (
        <label className="block text-sm">
          <span className="text-slate-500">Lesson text</span>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            rows={8}
            placeholder="Write the study material for this module…"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </label>
      ) : null}

      {contentType === "ASSIGNMENT" ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-500">Assignment instructions</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Write a short note on…"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-500">Minimum words</span>
            <input
              value={minWords}
              onChange={(e) => setMinWords(e.target.value)}
              type="number"
              min="0"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </label>
        </div>
      ) : null}

      {contentType === "QUIZ" ? (
        <QuizBuilder questions={questions} onChange={setQuestions} />
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving…" : existing ? "Save module" : "Add module"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
