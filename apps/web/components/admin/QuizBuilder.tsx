"use client";

export type QuizQuestionDraft = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
};

export function emptyQuizQuestion(index: number): QuizQuestionDraft {
  return {
    id: `q${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function questionsFromContentJson(contentJson: unknown, fallbackCount = 10): QuizQuestionDraft[] {
  if (!contentJson || typeof contentJson !== "object") {
    return Array.from({ length: fallbackCount }, (_, i) => emptyQuizQuestion(i));
  }
  const questions = (contentJson as { questions?: unknown }).questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return Array.from({ length: fallbackCount }, (_, i) => emptyQuizQuestion(i));
  }
  return questions.map((item, i) => {
    const q = item as Partial<QuizQuestionDraft>;
    const options = Array.isArray(q.options) && q.options.length >= 2
      ? q.options.map((opt) => String(opt ?? ""))
      : ["", "", "", ""];
    return {
      id: q.id || `q${i + 1}`,
      text: q.text || "",
      options,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
    };
  });
}

export function serializeQuizQuestions(questions: QuizQuestionDraft[]) {
  return JSON.stringify({
    questions: questions.map((q, i) => ({
      id: q.id || `q${i + 1}`,
      text: q.text.trim() || `Question ${i + 1}`,
      options: q.options.map((opt, oi) => opt.trim() || `Option ${oi + 1}`),
      correctIndex: q.correctIndex,
    })),
  });
}

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
        <p className="text-sm font-medium text-slate-950">Quiz questions</p>
        <button
          type="button"
          onClick={() => onChange([...questions, emptyQuizQuestion(questions.length)])}
          className="text-sm font-medium text-slate-700 hover:text-slate-950"
        >
          + Add question
        </button>
      </div>
      {questions.map((question, qi) => (
        <div key={question.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <label className="block min-w-0 flex-1 text-sm">
              <span className="text-slate-500">Question {qi + 1}</span>
              <input
                value={question.text}
                onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                placeholder="Question text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            {questions.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(questions.filter((_, i) => i !== qi))}
                className="mt-6 text-xs text-red-600"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {question.options.map((option, oi) => (
              <label key={oi} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${question.id}-correct`}
                  checked={question.correctIndex === oi}
                  onChange={() => updateQuestion(qi, { correctIndex: oi })}
                />
                <input
                  value={option}
                  onChange={(e) => {
                    const options = [...question.options];
                    options[oi] = e.target.value;
                    updateQuestion(qi, { options });
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
                <span className="shrink-0 text-[11px] text-slate-400">
                  {question.correctIndex === oi ? "Correct" : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
