import * as XLSX from "xlsx";
import { randomBytes } from "node:crypto";

export type ParsedQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  subject?: string;
  topic?: string;
  correctMarks?: number;
  negativeMarks?: number;
};

/**
 * Parse an Excel/CSV buffer into quiz questions.
 *
 * Supports two layouts — detected automatically by inspecting the header row:
 *
 * ── Legacy layout (6 columns) ──────────────────────────────────────────────
 *   Column A (0): Question text
 *   Column B (1): Option 1
 *   Column C (2): Option 2
 *   Column D (3): Option 3  (optional)
 *   Column E (4): Option 4  (optional)
 *   Column F (5): Correct answer — 1-4 or A-D
 *
 * ── Rich layout (matches the standard import template) ─────────────────────
 *   Column A  (0):  (blank / row index — ignored)
 *   Column B  (1):  S No.            (ignored)
 *   Column C  (2):  SUBJECT
 *   Column D  (3):  TOPIC
 *   Column E  (4):  QUESTION TYPE    (only SINGLECORRECT supported; others warned)
 *   Column F  (5):  QUESTION TEXT
 *   Column G  (6):  OPTION1
 *   Column H  (7):  OPTION2
 *   Column I  (8):  OPTION3          (optional)
 *   Column J  (9):  OPTION4          (optional)
 *   Column K (10):  OPTION5          (optional)
 *   Column L (11):  OPTION6          (optional)
 *   Column M (12):  RIGHT ANSWER     — 1-based number or A-F letter
 *   Column N (13):  EXPLANATION
 *   Column O (14):  CORRECT MARKS
 *   Column P (15):  NEGATIVE MARKS
 *
 * Returns an array of parsed questions and an array of row-level warnings.
 */
export function parseQuizExcel(buffer: Buffer): {
  questions: ParsedQuestion[];
  warnings: string[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Excel sheet is empty or unreadable");

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (rows.length === 0) throw new Error("Excel sheet is empty");

  // ── Detect layout by inspecting the first non-empty row ──────────────────
  // If any cell in the first row contains "QUESTION TEXT" (case-insensitive),
  // it is the rich-layout header row.
  const firstRow = (rows[0] ?? []).map((c) => String(c ?? "").trim().toUpperCase());
  const isRichLayout = firstRow.some(
    (cell) => cell === "QUESTION TEXT" || cell === "QUESTION TYPE" || cell === "RIGHT ANSWER"
  );

  return isRichLayout
    ? parseRichLayout(rows, 1)     // skip header row
    : parseLegacyLayout(rows);
}

// ── Legacy layout parser ────────────────────────────────────────────────────
function parseLegacyLayout(rows: unknown[][]): {
  questions: ParsedQuestion[];
  warnings: string[];
} {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  // Skip header row if first cell looks like a label
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
      warnings.push(`Row ${rowNum}: "${questionText}" — needs at least 2 options, skipped`);
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
      id: `q-${randomBytes(4).toString("hex")}`,
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

// ── Rich layout parser ──────────────────────────────────────────────────────
function parseRichLayout(rows: unknown[][], startRow: number): {
  questions: ParsedQuestion[];
  warnings: string[];
} {
  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const rowNum = i + 1;

    // col 5 = QUESTION TEXT
    const questionText = String(row[5] ?? "").trim();
    if (!questionText) continue;

    // col 4 = QUESTION TYPE — warn on unsupported types but still import
    const qType = String(row[4] ?? "").trim().toUpperCase();
    if (qType && qType !== "SINGLECORRECT" && qType !== "") {
      warnings.push(
        `Row ${rowNum}: "${questionText}" — question type "${qType}" is not fully supported; imported as single-correct`
      );
    }

    // cols 6–11 = OPTION1–OPTION6
    const rawOptions: string[] = [];
    for (let col = 6; col <= 11; col++) {
      const opt = String(row[col] ?? "").trim();
      if (opt) rawOptions.push(opt);
    }

    if (rawOptions.length < 2) {
      warnings.push(`Row ${rowNum}: "${questionText}" — needs at least 2 options, skipped`);
      continue;
    }

    // col 12 = RIGHT ANSWER
    const correctIndex = parseCorrectAnswer(
      String(row[12] ?? "").trim(),
      rawOptions.length,
      rowNum,
      questionText,
      warnings
    );

    // col 2 = SUBJECT
    const subject = String(row[2] ?? "").trim() || undefined;
    // col 3 = TOPIC
    const topic = String(row[3] ?? "").trim() || undefined;
    // col 13 = EXPLANATION
    const explanation = String(row[13] ?? "").trim() || undefined;
    // col 14 = CORRECT MARKS
    const correctMarksRaw = String(row[14] ?? "").trim();
    const correctMarks = correctMarksRaw ? Number(correctMarksRaw) : undefined;
    // col 15 = NEGATIVE MARKS
    const negativeMarksRaw = String(row[15] ?? "").trim();
    const negativeMarks = negativeMarksRaw ? Number(negativeMarksRaw) : undefined;

    questions.push({
      id: `q-${randomBytes(4).toString("hex")}`,
      text: questionText,
      options: rawOptions,
      correctIndex,
      ...(subject !== undefined && { subject }),
      ...(topic !== undefined && { topic }),
      ...(explanation !== undefined && { explanation }),
      ...(correctMarks !== undefined && !isNaN(correctMarks) && { correctMarks }),
      ...(negativeMarks !== undefined && !isNaN(negativeMarks) && { negativeMarks }),
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "No valid questions found. Ensure column F has question text, columns G–L have options, and column M has the correct answer."
    );
  }

  return { questions, warnings };
}

// ── Shared helper ───────────────────────────────────────────────────────────
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
