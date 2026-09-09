/**
 * Generates and triggers a download of an empty quiz Excel template.
 *
 * Column layout matches the rich-format the quiz importer expects:
 *   A  – (row index — leave blank or put a number)
 *   B  – S No.
 *   C  – SUBJECT
 *   D  – TOPIC
 *   E  – TAGS          (comma-separated, e.g. "biology,cells")
 *   F  – QUESTION TYPE (use SINGLECORRECT)
 *   G  – QUESTION TEXT
 *   H  – OPTION1
 *   I  – OPTION2
 *   J  – OPTION3       (optional)
 *   K  – OPTION4       (optional)
 *   L  – OPTION5       (optional)
 *   M  – OPTION6       (optional)
 *   N  – RIGHT ANSWER  (1-based number: 1, 2, 3 … or letter: A, B, C …)
 *   O  – EXPLANATION
 *   P  – CORRECT MARKS
 *   Q  – NEGATIVE MARKS
 */

import * as XLSX from "xlsx";

const HEADERS = [
  "",               // A  – row index (blank)
  "S No.",          // B
  "SUBJECT",        // C
  "TOPIC",          // D
  "QUESTION TYPE",  // E  (was F — TAGS column removed)
  "QUESTION TEXT",  // F
  "OPTION1",        // G
  "OPTION2",        // H
  "OPTION3",        // I
  "OPTION4",        // J
  "OPTION5",        // K
  "OPTION6",        // L
  "RIGHT ANSWER",   // M
  "EXPLANATION",    // N
  "CORRECT MARKS",  // O
  "NEGATIVE MARKS", // P
];

// One sample row so the admin can see the expected format immediately
const SAMPLE_ROW = [
  "",              // A
  "1",             // B – S No.
  "Science",       // C – SUBJECT
  "Cell Biology",  // D – TOPIC
  "SINGLECORRECT", // E – QUESTION TYPE
  "What is the powerhouse of the cell?", // F – QUESTION TEXT
  "Mitochondria",  // G – OPTION1
  "Nucleus",       // H – OPTION2
  "Ribosome",      // I – OPTION3
  "Cell Wall",     // J – OPTION4
  "",              // K – OPTION5 (blank)
  "",              // L – OPTION6 (blank)
  "1",             // M – RIGHT ANSWER (Mitochondria)
  "Mitochondria produces ATP through cellular respiration.", // N – EXPLANATION
  "3",             // O – CORRECT MARKS
  "0.75",          // P – NEGATIVE MARKS
];

export function downloadQuizTemplate(fileName = "quiz-questions-template.xlsx") {
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE_ROW]);

  // Column widths (approximate characters)
  ws["!cols"] = [
    { wch: 4 },   // A
    { wch: 6 },   // B – S No.
    { wch: 14 },  // C – SUBJECT
    { wch: 16 },  // D – TOPIC
    { wch: 16 },  // E – QUESTION TYPE
    { wch: 46 },  // F – QUESTION TEXT
    { wch: 22 },  // G – OPTION1
    { wch: 22 },  // H – OPTION2
    { wch: 22 },  // I – OPTION3
    { wch: 22 },  // J – OPTION4
    { wch: 22 },  // K – OPTION5
    { wch: 22 },  // L – OPTION6
    { wch: 14 },  // M – RIGHT ANSWER
    { wch: 40 },  // N – EXPLANATION
    { wch: 14 },  // O – CORRECT MARKS
    { wch: 15 },  // P – NEGATIVE MARKS
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Questions");

  // Write as array buffer and trigger download
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
