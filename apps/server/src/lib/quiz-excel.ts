import * as XLSX from "xlsx";
import { randomBytes } from "node:crypto";

export type ParsedQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
};

/**
 * Parse an Excel/CSV buffer into quiz questions.
 *
 * Expected sheet layout (first sheet used):
 *   Row 1: Header row (skipped automatically if first cell looks like a label)
 *   Column A: Question text
 *   Column B: Option 1
 *   Column C: Option 2
 *   Column D: Option 3  (optional — minimum 2 options required)
 *   Column E: Option 4  (optional)
 *   Column F: Correct answer — number 1-4 or letter A-D (case-insensitive)
 *
 * Returns an array of parsed questions and an array of row-level warnings.
 */
export function parseQuizExcel(buffer: Buffer): {
  questions: ParsedQuestion[];
  warnings: string[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Excel sheet is empty or unreadable");
  }
  // Convert to array of arrays (raw values)
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Excel sheet is empty");
  }

  const questions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  // Detect and skip header row: if the first cell contains a non-numeric string
  // that looks like a column label (e.g. "Question", "Q", "#"), skip it.
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
    if (!questionText) continue; // skip empty rows silently

    // Gather options — columns B, C, D, E (indices 1-4)
    const rawOptions: string[] = [];
    for (let col = 1; col <= 4; col++) {
      const opt = String(row[col] ?? "").trim();
      if (opt) rawOptions.push(opt);
    }

    if (rawOptions.length < 2) {
      warnings.push(`Row ${rowNum}: "${questionText}" — needs at least 2 options, skipped`);
      continue;
    }

    // Parse correct answer from column F (index 5)
    const correctRaw = String(row[5] ?? "").trim();
    let correctIndex = 0;

    if (!correctRaw) {
      warnings.push(`Row ${rowNum}: "${questionText}" — no correct answer specified, defaulting to option 1`);
    } else {
      const asNum = parseInt(correctRaw, 10);
      if (!isNaN(asNum) && asNum >= 1 && asNum <= rawOptions.length) {
        correctIndex = asNum - 1;
      } else {
        const letter = correctRaw.toUpperCase();
        const letterIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
        if (letterIndex >= 0 && letterIndex < rawOptions.length) {
          correctIndex = letterIndex;
        } else {
          warnings.push(`Row ${rowNum}: "${questionText}" — invalid correct answer "${correctRaw}", defaulting to option 1`);
        }
      }
    }

    questions.push({
      id: `q-${randomBytes(4).toString("hex")}`,
      text: questionText,
      options: rawOptions,
      correctIndex,
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "No valid questions found. Make sure Column A has question text, columns B-E have options, and column F has the correct answer (1-4 or A-D)."
    );
  }

  return { questions, warnings };
}
