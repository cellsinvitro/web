"use client";

import { useState } from "react";

export type QuizQuestionDraft = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  // rich fields (from new Excel format — all optional)
  explanation?: string;
  subject?: string;
  topic?: string;
  correctMarks?: number;
  negativeMarks?: number;
};

export function emptyQuizQuestion(index: number): QuizQuestionDraft {
  return {
    id: `q${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    options: ["", ""],
    correctIndex: 0,
  };
}

export function questionsFromContentJson(
  contentJson: unknown,
  fallbackCount = 1
): QuizQuestionDraft[] {
  if (!contentJson || typeof contentJson !== "object") {
    return Array.from({ length: fallbackCount }, (_, i) => emptyQuizQuestion(i));
  }
  const questions = (contentJson as { questions?: unknown }).questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return Array.from({ length: fallbackCount }, (_, i) => emptyQuizQuestion(i));
  }
  return questions.map((item, i) => {
    const q = item as Partial<QuizQuestionDraft>;
    const options =
      Array.isArray(q.options) && q.options.length >= 2
        ? q.options.map((opt) => String(opt ?? ""))
        : ["", ""];
    return {
      id: q.id || `q${i + 1}`,
      text: q.text || "",
      options,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      ...(q.explanation !== undefined && { explanation: q.explanation }),
      ...(q.subject !== undefined && { subject: q.subject }),
      ...(q.topic !== undefined && { topic: q.topic }),
      ...(typeof q.correctMarks === "number" && { correctMarks: q.correctMarks }),
      ...(typeof q.negativeMarks === "number" && { negativeMarks: q.negativeMarks }),
    };
  });
}

export function serializeQuizQuestions(questions: QuizQuestionDraft[]): string {
  return JSON.stringify({
    questions: questions.map((q, i) => {
      const base = {
        id: q.id || `q${i + 1}`,
        text: q.text.trim() || `Question ${i + 1}`,
        options: q.options.map((opt, oi) => opt.trim() || `Option ${oi + 1}`),
        correctIndex: q.correctIndex,
      };
      return {
        ...base,
        ...(q.explanation?.trim() && { explanation: q.explanation.trim() }),
        ...(q.subject?.trim() && { subject: q.subject.trim() }),
        ...(q.topic?.trim() && { topic: q.topic.trim() }),
        ...(typeof q.correctMarks === "number" && { correctMarks: q.correctMarks }),
        ...(typeof q.negativeMarks === "number" && { negativeMarks: q.negativeMarks }),
      };
    }),
  });
}

// ── Sub-components ──────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onRemove,
}: {
  question: QuizQuestionDraft;
  index: number;
  total: number;
  onChange: (patch: Partial<QuizQuestionDraft>) => void;
  onRemove: () => void;
}) {
  const [showMeta, setShowMeta] = useState(
    // auto-expand meta if any rich field is populated
    !!(
      question.explanation ||
      question.subject ||
      question.topic ||
      question.correctMarks !== undefined ||
      question.negativeMarks !== undefined
    )
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Question header */}
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold text-slate-500">
          {index + 1}
        </span>
        <label className="block min-w-0 flex-1 text-sm">
          <span className="text-xs font-medium text-slate-500">Question</span>
          <input
            value={question.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Question text"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
        </label>
        {total > 1 ? (
          <button
            type="button"
            onClick={onRemove}
            className="mt-5 shrink-0 text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        ) : null}
      </div>

      {/* Options */}
      <div className="space-y-2 px-4 pb-3">
        {question.options.map((option, oi) => (
          <label key={oi} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${question.id}-correct`}
              checked={question.correctIndex === oi}
              onChange={() => onChange({ correctIndex: oi })}
              className="accent-slate-950"
            />
            <input
              value={option}
              onChange={(e) => {
                const options = [...question.options];
                options[oi] = e.target.value;
                onChange({ options });
              }}
              placeholder={`Option ${oi + 1}`}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
            />
            {question.correctIndex === oi ? (
              <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Correct
              </span>
            ) : (
              <span className="w-[46px] shrink-0" />
            )}
          </label>
        ))}

        {/* Add / remove option buttons */}
        <div className="flex gap-3 pt-1">
          {question.options.length < 6 ? (
            <button
              type="button"
              onClick={() => onChange({ options: [...question.options, ""] })}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              + Add option
            </button>
          ) : null}
          {question.options.length > 2 ? (
            <button
              type="button"
              onClick={() => {
                const opts = question.options.slice(0, -1);
                onChange({
                  options: opts,
                  correctIndex: Math.min(question.correctIndex, opts.length - 1),
                });
              }}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              − Remove last option
            </button>
          ) : null}
        </div>
      </div>

      {/* Rich meta toggle */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowMeta((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <span>Subject / Topic / Marks / Explanation</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${showMeta ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {showMeta ? (
          <div className="space-y-3 px-4 pb-4 pt-1">
            {/* Subject + Topic */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-medium text-slate-500">Subject</span>
                <input
                  value={question.subject ?? ""}
                  onChange={(e) =>
                    onChange({ subject: e.target.value || undefined })
                  }
                  placeholder="e.g. Science"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="block text-xs">
                <span className="font-medium text-slate-500">Topic</span>
                <input
                  value={question.topic ?? ""}
                  onChange={(e) =>
                    onChange({ topic: e.target.value || undefined })
                  }
                  placeholder="e.g. Cell Biology"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                />
              </label>
            </div>

            {/* Correct Marks + Negative Marks */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-medium text-slate-500">Correct marks</span>
                <input
                  value={question.correctMarks ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onChange({ correctMarks: v === "" ? undefined : Number(v) });
                  }}
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="e.g. 3"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                />
              </label>
              <label className="block text-xs">
                <span className="font-medium text-slate-500">Negative marks</span>
                <input
                  value={question.negativeMarks ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onChange({ negativeMarks: v === "" ? undefined : Number(v) });
                  }}
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="e.g. 0.75"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                />
              </label>
            </div>

            {/* Explanation */}
            <label className="block text-xs">
              <span className="font-medium text-slate-500">Explanation</span>
              <textarea
                value={question.explanation ?? ""}
                onChange={(e) =>
                  onChange({ explanation: e.target.value || undefined })
                }
                rows={3}
                placeholder="Why is this the correct answer?"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main QuizBuilder component ──────────────────────────────────────────────

export default function QuizBuilder({
  questions,
  onChange,
}: {
  questions: QuizQuestionDraft[];
  onChange: (questions: QuizQuestionDraft[]) => void;
}) {
  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-950">
          Quiz questions
          {questions.length > 0 ? (
            <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
              {questions.length}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => onChange([...questions, emptyQuizQuestion(questions.length)])}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          + Add question
        </button>
      </div>

      {questions.map((question, qi) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={qi}
          total={questions.length}
          onChange={(patch) => updateQuestion(qi, patch)}
          onRemove={() => onChange(questions.filter((_, i) => i !== qi))}
        />
      ))}
    </div>
  );
}
