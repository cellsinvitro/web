export const MODULE_CONTENT_TYPES = [
  { value: "VIDEO", label: "Video" },
  { value: "PDF", label: "PDF" },
  { value: "PPT", label: "PowerPoint" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "QUIZ", label: "Quiz / Test" },
] as const;

export const REMINDER_MODES = [
  { value: "AUTOMATIC", label: "Automatic" },
  { value: "MANUAL", label: "Manual only" },
  { value: "OFF", label: "Off" },
] as const;

export function formatPrice(amount: number, currency = "INR") {
  if (amount <= 0) return "Free";
  const value = amount / 100;
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatCourseDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getModuleTypeLabel(contentType: string) {
  const found = MODULE_CONTENT_TYPES.find((t) => t.value === contentType);
  return found?.label ?? contentType;
}

export function parseQuizQuestionsJson(contentJson: unknown) {
  if (!contentJson || typeof contentJson !== "object") return [];
  const questions = (contentJson as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];
  return questions as Array<{
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
  }>;
}

export function parseAssignmentJson(contentJson: unknown) {
  if (!contentJson || typeof contentJson !== "object") return { instructions: "" };
  const data = contentJson as { instructions?: string; minWords?: number };
  return {
    instructions: data.instructions || "",
    minWords: data.minWords,
  };
}

export function buildDefaultQuizJson(questionCount = 10) {
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Question ${i + 1}`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: 0,
  }));
  return JSON.stringify({ questions });
}

export function buildDefaultAssignmentJson() {
  return JSON.stringify({
    instructions: "Write a short note on the topic covered in this module.",
    minWords: 50,
  });
}
