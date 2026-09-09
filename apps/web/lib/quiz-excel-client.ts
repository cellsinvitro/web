/**
 * Client-side Excel/CSV parser for quiz questions.
 *
 * Mirrors the logic in apps/server/src/lib/quiz-excel.ts but runs entirely
 * in the browser — no API call needed, so new (unsaved) quiz modules can
 * have questions populated before the first save.
 *
 * Supports two layouts — auto-detected by the header row:
 *
 * ── Legacy layout (6 columns) ──────────────────────────────────────────────
 *   Column A (0): Question text
 *   Column B (1): Option 1
 *   Column C (2): Option 2
 *   Column D (3): Option 3  (optional)
 *   Column E (4): Option 4  (optional)
 *   Column F (5): Correct answer — 1-4 or A-D
 *
 * ── Rich layout (standard import template) ─────────────────────────────────
 *   Column A  (0):  (blank / row index — ignored)
 *   Column B  (1):  S No.            (ignored)
 *   Column C  (2):  SUBJECT
 *   Column D  (3):  TOPIC
 *   Column E  (4):  TAGS             (comma-separated)
 *   Column F  (5):  QUESTION TYPE    (only SINGLECORRECT supported; others warned)
 *   Column G  (6):  QUESTION TEXT
 *   Column H  (7):  OPTION1
 *   Column I  (8):  OPTION2
 *   Column J  (9):  OPTION3          (optional)
 *   Column K (10):  OPTION4          (optional)
 *   Column L (11):  OPTION5          (optional)
 *   Column M (12):  OPTION6          (optional)
 *   Column N (13):  RIGHT ANSWER     — 1-based number or A-F letter
 *   Column O (14):  EXPLANATION
 *   Column P (15):  CORRECT MARKS
 *   Column Q (16):  NEGATIVE MARKS
 */

import * as XLSX from "xlsx";
import type { QuizQuestionDraft } from "@/components/admin/QuizBuilder";

export type ParsedExcelResult = {
  questions: QuizQuestionDraft[];
  warnings: string[];
};

function randomId(): string {
  return `q-${Math.random().toString(36).slice(2, 10)}`;
}

export async function parseQuizExcelFile(file: File): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Excel sheet is empty or unreadable");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (rows.length === 0) throw new Error("Excel sheet is empty");

  // Detect layout by inspecting first row for rich-format headers
  const firstRow = (rows[0] ?? []).map((c) => String(c ?? "").trim().toUpperCase());
  const isRichLayout = firstRow.some(
    (cell) =>
      cell === "QUESTION TEXT" || cell === "QUESTION TYPE" || cell === "RIGHT ANSWER"
  );

  return isRichLayout
    ? parseRichLayout(rows, 1)
    : parseLegacyLayout(rows);
}

// ── Legacy layout ────────────────────────────────────────────────────────────
function parseLegacyLayout(rows: unknown[][]): ParsedExcelResult {
  const questions: QuizQuestionDraft[] = [];
  const warnings: string[] = [];

  // Skip header row if first cell looks like a column label
  let startRow = 0;
  const firstCell = String(rows[0]?.[0] ?? "").trim().toLowerCase();
  if (
    firstCell === "" ||
    firstCell === "question" ||
    firstCell === "q" ||
    firstCell === "#" ||
    firstCell === "no" ||
    firstCell === "sno" ||
    firstCell === "s.no"
  ) {
    startRow = 1;
  }

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNum = i + 1;

    const questionText = String(row[0] ?? "").trim();
    if (!questionText) continue;

    const rawOptions: string[] = [];
    for (let col = 1; col <= 4; col++) {
      const opt = String(row[col] ?? "").trim();
      if (opt) rawOptions.push(opt);
    }

    if (rawOptions.length < 2) {
      warnings.push(
        `Row ${rowNum}: "${questionText}" — needs at least 2 options, skipped`
      );
      continue;
    }

    const correctIndex = parseCorrectAnswer(
      String(row[5] ?? "").trim(),
      rawOptions.length,
      rowNum,
      questionText,
      warnings
    );

    questions.push({
      id: randomId(),
      text: questionText,
      options: rawOptions,
      correctIndex,
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "No valid questions found. Make sure Column A has question text, columns B–E have options, and column F has the correct answer (1–4 or A–D)."
    );
  }

  return { questions, warnings };
}

// ── Rich layout ──────────────────────────────────────────────────────────────
function parseRichLayout(rows: unknown[][], startRow: number): ParsedExcelResult {
  const questions: QuizQuestionDraft[] = [];
  const warnings: string[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNum = i + 1;

    const questionText = String(row[6] ?? "").trim();
    if (!questionText) continue;

    // Warn on unsupported question types
    const qType = String(row[5] ?? "").trim().toUpperCase();
    if (qType && qType !== "SINGLECORRECT") {
      warnings.push(
        `Row ${rowNum}: "${questionText}" — question type "${qType}" is not fully supported; imported as single-correct`
      );
    }

    // Options from cols 7–12
    const rawOptions: string[] = [];
    for (let col = 7; col <= 12; col++) {
      const opt = String(row[col] ?? "").trim();
      if (opt) rawOptions.push(opt);
    }

    if (rawOptions.length < 2) {
      warnings.push(
        `Row ${rowNum}: "${questionText}" — needs at least 2 options, skipped`
      );
      continue;
    }

    const correctIndex = parseCorrectAnswer(
      String(row[13] ?? "").trim(),
      rawOptions.length,
      rowNum,
      questionText,
      warnings
    );

    const subject = String(row[2] ?? "").trim() || undefined;
    const topic = String(row[3] ?? "").trim() || undefined;
    const tagsRaw = String(row[4] ?? "").trim();
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const explanation = String(row[14] ?? "").trim() || undefined;
    const correctMarksRaw = String(row[15] ?? "").trim();
    const correctMarks = correctMarksRaw ? Number(correctMarksRaw) : undefined;
    const negativeMarksRaw = String(row[16] ?? "").trim();
    const negativeMarks = negativeMarksRaw ? Number(negativeMarksRaw) : undefined;

    questions.push({
      id: randomId(),
      text: questionText,
      options: rawOptions,
      correctIndex,
      ...(subject !== undefined && { subject }),
      ...(topic !== undefined && { topic }),
      ...(tags !== undefined && { tags }),
      ...(explanation !== undefined && { explanation }),
      ...(correctMarks !== undefined && !isNaN(correctMarks) && { correctMarks }),
      ...(negativeMarks !== undefined && !isNaN(negativeMarks) && { negativeMarks }),
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "No valid questions found. Ensure column G has question text, columns H–M have options, and column N has the correct answer."
    );
  }

  return { questions, warnings };
}

// ── Shared helper ─────────────────────────────────────────────────────────────
function parseCorrectAnswer(
  raw: string,
  optionCount: number,
  rowNum: number,
  questionText: string,
  warnings: string[]
): number {
  if (!raw) {
    warnings.push(
      `Row ${rowNum}: "${questionText}" — no correct answer specified, defaulting to option 1`
    );
    return 0;
  }

  const asNum = parseInt(raw, 10);
  if (!isNaN(asNum) && asNum >= 1 && asNum <= optionCount) {
    return asNum - 1;
  }

  const letter = raw.toUpperCase();
  const letterIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
  if (letterIndex >= 0 && letterIndex < optionCount) {
    return letterIndex;
  }

  warnings.push(
    `Row ${rowNum}: "${questionText}" — invalid correct answer "${raw}", defaulting to option 1`
  );
  return 0;
}
