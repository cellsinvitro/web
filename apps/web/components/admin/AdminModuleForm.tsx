"use client";

import { useRef, useState } from "react";
import {
  createAdminModule,
  getAdminVideoUploadSignature,
  importQuizFromExcel,
  updateAdminModule,
  updateQuizSettings,
  uploadVideoDirectly,
  type CourseModule,
} from "@/lib/api";
import {
  MODULE_CONTENT_TYPES,
  moduleAcceptsFile,
  moduleFileAccept,
  parseAssignmentJson,
  parseTextBody,
} from "@/lib/courses";
import { parseQuizExcelFile } from "@/lib/quiz-excel-client";
import { downloadQuizTemplate } from "@/lib/quiz-excel-template";
import QuizBuilder, {
  questionsFromContentJson,
  serializeQuizQuestions,
  type QuizQuestionDraft,
} from "@/components/admin/QuizBuilder";

// ---------------------------------------------------------------------------
// Replace/Append inline dialog
// ---------------------------------------------------------------------------
function ReplaceAppendDialog({
  incoming,
  existing,
  onReplace,
  onAppend,
  onCancel,
}: {
  incoming: number;
  existing: number;
  onReplace: () => void;
  onAppend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <p className="text-sm font-medium text-slate-950">
        Merge imported questions?
      </p>
      <p className="mt-1 text-xs text-slate-500">
        You already have <strong>{existing}</strong> question
        {existing !== 1 ? "s" : ""}. The Excel file contains{" "}
        <strong>{incoming}</strong> new question{incoming !== 1 ? "s" : ""}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Replace all
        </button>
        <button
          type="button"
          onClick={onAppend}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Append ({existing + incoming} total)
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------
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

  // Quiz-specific settings
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(
    existing?.questionsPerAttempt != null ? String(existing.questionsPerAttempt) : ""
  );

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Pending questions waiting for Replace/Append decision
  const [pendingQuestions, setPendingQuestions] = useState<QuizQuestionDraft[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalQuestionsInBank = questions.length;
  const qpaNum = parseInt(questionsPerAttempt, 10);
  const effectiveQpa =
    !questionsPerAttempt || isNaN(qpaNum)
      ? totalQuestionsInBank
      : Math.min(qpaNum, totalQuestionsInBank);

  // ---------------------------------------------------------------------------
  // Excel import handler — works for both new and existing modules
  // ---------------------------------------------------------------------------
  const handleExcelImport = async () => {
    if (!excelFile) return;
    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    setImportWarnings([]);
    setPendingQuestions(null);

    try {
      let parsed: QuizQuestionDraft[];
      let warnings: string[];

      if (existing) {
        // For existing modules: hit the server API (persists immediately),
        // then also parse client-side to get the draft objects for QuizBuilder.
        const [serverResult, clientResult] = await Promise.all([
          importQuizFromExcel(courseId, existing.id, excelFile),
          parseQuizExcelFile(excelFile),
        ]);
        warnings = serverResult.warnings;
        setImportMessage(serverResult.message);
        parsed = clientResult.questions;
      } else {
        // For new modules: parse entirely client-side, no API call yet.
        const clientResult = await parseQuizExcelFile(excelFile);
        warnings = clientResult.warnings;
        parsed = clientResult.questions;
        setImportMessage(
          `Parsed ${parsed.length} question${parsed.length !== 1 ? "s" : ""} — they'll be saved with the module.`
        );
      }

      setImportWarnings(warnings);

      // If there are already non-empty questions, ask Replace or Append.
      const hasExistingQuestions =
        questions.length > 0 &&
        questions.some((q) => q.text.trim() !== "");

      if (hasExistingQuestions) {
        setPendingQuestions(parsed);
      } else {
        // Nothing meaningful to preserve — replace directly.
        setQuestions(parsed);
        resetExcelInput();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetExcelInput = () => {
    setExcelFile(null);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const handleReplace = () => {
    if (!pendingQuestions) return;
    setQuestions(pendingQuestions);
    setPendingQuestions(null);
    resetExcelInput();
  };

  const handleAppend = () => {
    if (!pendingQuestions) return;
    setQuestions((prev) => [...prev, ...pendingQuestions]);
    setPendingQuestions(null);
    resetExcelInput();
  };

  const handleMergeCancel = () => {
    setPendingQuestions(null);
    resetExcelInput();
    setImportMessage(null);
    setImportWarnings([]);
  };

  // ---------------------------------------------------------------------------
  // Form submit
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Module title is required");
      return;
    }
    if (
      moduleAcceptsFile(contentType) &&
      !file &&
      (!existing || existing.contentType !== contentType)
    ) {
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
      form.append("contentType", contentType);
      if (durationMinutes) form.append("durationMinutes", durationMinutes);

      if (file && contentType === "VIDEO") {
        setUploadProgress(0);
        const signature = await getAdminVideoUploadSignature(courseId);
        const result = await uploadVideoDirectly(file, signature, setUploadProgress);
        form.append("videoPublicId", result.public_id);
        form.append("videoFileName", file.name);
        form.append("videoMimeType", file.type);
        form.append("videoFileSize", String(file.size));
      } else if (file && moduleAcceptsFile(contentType)) {
        form.append("file", file);
      }

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

      let savedModule: CourseModule;
      if (existing) {
        const res = await updateAdminModule(courseId, existing.id, form);
        savedModule = res.module;
      } else {
        savedModule = await createAdminModule(courseId, form);
        // Reset form for next module creation
        setTitle("");
        setDescription("");
        setDurationMinutes("");
        setFile(null);
        setTextBody("");
        setInstructions("Write a short note on the topic covered in this module.");
        setMinWords("50");
        setQuestions(questionsFromContentJson(null));
        setQuestionsPerAttempt("");
        setImportMessage(null);
        setImportWarnings([]);
      }

      // Persist questionsPerAttempt separately for quiz modules
      if (contentType === "QUIZ" && savedModule?.id) {
        const qpa =
          questionsPerAttempt.trim() === ""
            ? null
            : parseInt(questionsPerAttempt, 10);
        await updateQuizSettings(
          courseId,
          savedModule.id,
          isNaN(qpa as number) ? null : qpa
        );
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module");
    } finally {
      setUploadProgress(null);
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          aria-label="Module content type"
        >
          {MODULE_CONTENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
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
        <div className="space-y-5">
          {/* Quiz settings */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-950">Quiz settings</p>
            <div className="mt-3 flex items-end gap-3">
              <label className="flex-1 text-sm">
                <span className="text-slate-500">
                  Questions per attempt
                  <span className="ml-1 text-xs text-slate-400">
                    (leave blank to show all)
                  </span>
                </span>
                <input
                  value={questionsPerAttempt}
                  onChange={(e) => setQuestionsPerAttempt(e.target.value)}
                  type="number"
                  min="1"
                  max={totalQuestionsInBank || undefined}
                  placeholder={`All (${totalQuestionsInBank})`}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
              </label>
              {questionsPerAttempt && !isNaN(qpaNum) ? (
                <p className="pb-2.5 text-xs text-slate-500">
                  Users see {effectiveQpa} of {totalQuestionsInBank} questions, shuffled each attempt
                </p>
              ) : (
                <p className="pb-2.5 text-xs text-slate-500">
                  Users see all {totalQuestionsInBank} questions, shuffled
                </p>
              )}
            </div>
          </div>

          {/* Excel import — available for both new and existing modules */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-950">
                  Import questions from Excel
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload an Excel file (.xlsx) to populate questions.{" "}
                  <span className="font-medium">
                    Format: A=blank, B=S No., C=Subject, D=Topic, E=Tags, F=Question Type, G=Question Text, H–M=Options, N=Right Answer, O=Explanation, P=Correct Marks, Q=Negative Marks
                  </span>
                  {!existing ? (
                    <span className="ml-1 text-blue-600">
                      · Imported questions are editable before saving.
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadQuizTemplate()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Download template
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => {
                  setExcelFile(e.target.files?.[0] ?? null);
                  setImportMessage(null);
                  setImportWarnings([]);
                  setImportError(null);
                  setPendingQuestions(null);
                }}
                className="text-sm"
                id="excel-upload"
              />
              <button
                type="button"
                onClick={handleExcelImport}
                disabled={!excelFile || importing}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>

            {importError ? (
              <p className="mt-2 text-sm text-red-600">{importError}</p>
            ) : null}

            {importMessage && !pendingQuestions ? (
              <p className="mt-2 text-sm font-medium text-green-700">
                {importMessage}
              </p>
            ) : null}

            {importWarnings.length > 0 && !pendingQuestions ? (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-700">
                {importWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}

            {/* Replace / Append decision */}
            {pendingQuestions ? (
              <div className="mt-3">
                <ReplaceAppendDialog
                  incoming={pendingQuestions.length}
                  existing={questions.length}
                  onReplace={handleReplace}
                  onAppend={handleAppend}
                  onCancel={handleMergeCancel}
                />
                {importWarnings.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-amber-700">
                    {importWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Manual quiz builder — always visible so imported questions are editable */}
          <QuizBuilder questions={questions} onChange={setQuestions} />
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploadProgress !== null
            ? `Uploading video (${uploadProgress}%)`
            : submitting
              ? "Saving…"
              : existing
                ? "Save module"
                : "Add module"}
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
