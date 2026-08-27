"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  completeModule,
  getModuleContentUrl,
  submitAssignment,
  submitQuiz,
  updateModuleProgress,
  type Course,
  type CourseModule,
} from "@/lib/api";
import {
  getModuleTypeLabel,
  parseAssignmentJson,
  parseQuizQuestionsJson,
  parseTextBody,
} from "@/lib/courses";

type ModuleProgress = {
  moduleId: string;
  completed: boolean;
  watchProgress: number;
  quizScore: number | null;
  quizPassed: boolean | null;
  assignmentSubmitted: boolean;
};

function VideoPlayer({
  courseId,
  module,
  initialProgress,
  onComplete,
}: {
  courseId: string;
  module: CourseModule;
  initialProgress: number;
  onComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastReported = useRef(initialProgress);

  useEffect(() => {
    fetch(getModuleContentUrl(courseId, module.id), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load video");
        const data = await res.json();
        setStreamUrl(data.streamUrl);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load video"));
  }, [courseId, module.id]);

  const reportProgress = useCallback(
    async (progress: number) => {
      if (progress <= lastReported.current) return;
      lastReported.current = progress;
      const result = await updateModuleProgress(courseId, module.id, progress);
      if (result.completed) onComplete();
    },
    [courseId, module.id, onComplete]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video.duration) return;
      const progress = video.currentTime / video.duration;
      reportProgress(progress);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [reportProgress, streamUrl]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!streamUrl) return <p className="text-sm text-slate-500">Loading video…</p>;

  return (
    <video
      ref={videoRef}
      src={streamUrl}
      controls
      playsInline
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      className="aspect-video w-full rounded-xl bg-black object-contain"
      onError={() => setError("Unable to play this video. Please try again later.")}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function PdfViewer({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const url = getModuleContentUrl(courseId, moduleId);
  return (
    <iframe
      src={url}
      title="Document"
      className="h-[70vh] w-full rounded-xl border border-slate-200"
    />
  );
}

function ImageViewer({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(getModuleContentUrl(courseId, moduleId), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load image");
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { imageUrl?: string };
          if (!data.imageUrl) throw new Error("Image URL missing");
          setSrc(data.imageUrl);
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load image"));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [courseId, moduleId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!src) return <p className="text-sm text-slate-500">Loading image…</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />
  );
}

function QuizTaker({
  courseId,
  module,
  onComplete,
}: {
  courseId: string;
  module: CourseModule;
  onComplete: () => void;
}) {
  const questions = parseQuizQuestionsJson(module.contentJson);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitQuiz(courseId, module.id, answers);
      setResult(res);
      if (res.passed) onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-slate-200 p-4">
          <p className="font-medium text-slate-950">
            {qi + 1}. {q.text}
          </p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                  disabled={Boolean(result)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      {!result ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || questions.length === 0}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit quiz"}
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-950">
            Score: {result.score.toFixed(0)}% ({result.correct}/{result.total})
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {result.passed ? "Passed!" : "Not passed — review and try again."}
          </p>
        </div>
      )}
    </div>
  );
}

function AssignmentForm({
  courseId,
  module,
  onComplete,
}: {
  courseId: string;
  module: CourseModule;
  onComplete: () => void;
}) {
  const { instructions } = parseAssignmentJson(module.contentJson);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitAssignment(courseId, module.id, text);
      setDone(true);
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {instructions ? (
        <p className="text-sm text-slate-600">{instructions}</p>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        disabled={done}
        placeholder="Write your submission here…"
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
      />
      {!done ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit assignment"}
        </button>
      ) : (
        <p className="text-sm font-medium text-green-700">Assignment submitted.</p>
      )}
    </div>
  );
}

export default function CoursePlayer({
  course,
  moduleProgress,
  onProgressUpdate,
}: {
  course: Course;
  moduleProgress: ModuleProgress[];
  onProgressUpdate: () => void;
}) {
  const modules = course.modules ?? [];
  const [activeId, setActiveId] = useState(modules[0]?.id ?? "");

  const progressMap = new Map(moduleProgress.map((p) => [p.moduleId, p]));
  const activeModule = modules.find((m) => m.id === activeId);

  const handleComplete = () => onProgressUpdate();

  const handleMarkComplete = async (moduleId: string) => {
    await completeModule(course.id, moduleId);
    onProgressUpdate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Modules
        </h2>
        <ul className="mt-3 space-y-1">
          {modules.map((module, index) => {
            const prog = progressMap.get(module.id);
            const done = prog?.completed;
            return (
              <li key={module.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(module.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    activeId === module.id
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done
                          ? "bg-green-500 text-white"
                          : activeId === module.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{module.title}</span>
                      <span
                        className={`text-xs ${
                          activeId === module.id ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {getModuleTypeLabel(module.contentType)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeModule ? (
          <>
            <h2 className="text-xl font-semibold text-slate-950">{activeModule.title}</h2>
            {activeModule.description ? (
              <p className="mt-2 text-sm text-slate-500">{activeModule.description}</p>
            ) : null}

            <div className="mt-6">
              {activeModule.contentType === "VIDEO" ? (
                <VideoPlayer
                  courseId={course.id}
                  module={activeModule}
                  initialProgress={progressMap.get(activeModule.id)?.watchProgress ?? 0}
                  onComplete={handleComplete}
                />
              ) : null}
              {activeModule.contentType === "PDF" || activeModule.contentType === "PPT" ? (
                <>
                  <PdfViewer courseId={course.id} moduleId={activeModule.id} />
                  {!progressMap.get(activeModule.id)?.completed ? (
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(activeModule.id)}
                      className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Mark as completed
                    </button>
                  ) : null}
                </>
              ) : null}
              {activeModule.contentType === "IMAGE" ? (
                <>
                  <ImageViewer courseId={course.id} moduleId={activeModule.id} />
                  {!progressMap.get(activeModule.id)?.completed ? (
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(activeModule.id)}
                      className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Mark as completed
                    </button>
                  ) : null}
                </>
              ) : null}
              {activeModule.contentType === "TEXT" ? (
                <>
                  <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    {parseTextBody(activeModule.contentJson) || "No text content yet."}
                  </div>
                  {!progressMap.get(activeModule.id)?.completed ? (
                    <button
                      type="button"
                      onClick={() => handleMarkComplete(activeModule.id)}
                      className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Mark as completed
                    </button>
                  ) : null}
                </>
              ) : null}
              {activeModule.contentType === "QUIZ" ? (
                <QuizTaker
                  courseId={course.id}
                  module={activeModule}
                  onComplete={handleComplete}
                />
              ) : null}
              {activeModule.contentType === "ASSIGNMENT" ? (
                <AssignmentForm
                  courseId={course.id}
                  module={activeModule}
                  onComplete={handleComplete}
                />
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No modules in this course yet.</p>
        )}
      </div>
    </div>
  );
}
