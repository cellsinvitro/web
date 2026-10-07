/**
 * Helper to download a clean pre-formatted Word Document template (.docx)
 * with standard academic page settings (1-inch margins, 1.5 line spacing, 12pt Times New Roman/Calibri font).
 */

export function downloadStandardTemplate() {
  const content = `================================================================================
STANDARD ACADEMIC & PROFESSIONAL DOCUMENT TEMPLATE
CellsInVitro Document Modification Services
================================================================================

FORMATTING SPECIFICATIONS INCLUDED IN THIS TEMPLATE:
• Margins: 1 inch (2.54 cm) on all sides (Top, Bottom, Left, Right)
• Line Spacing: 1.5 Lines
• Font Style: Times New Roman / Calibri / Arial
• Font Size: 12 pt for body text, 14 pt bold for Headings
• Paragraph Alignment: Justified or Left-aligned with 0.5-inch first-line indent
• Header: Running head & Page numbers at top right

--------------------------------------------------------------------------------
IMPORTANT INSTRUCTIONS FOR UPLOADING YOUR DOCUMENT:
--------------------------------------------------------------------------------
1. REMOVE ALL EMBEDDED IMAGES:
   Please extract or remove all high-resolution figures, photos, diagrams, or 
   scanned images before uploading your manuscript for editing.
   (If figures need separate review, please upload them in the optional 10MB reference file).

2. KEEP TABLES & EQUATIONS IN EDITABLE TEXT FORMAT:
   Ensure all tables use standard Word table structures so formatting & alignment 
   can be refined cleanly.

3. REMOVE EMBEDDED MACROS OR PASSWORD PROTECTION:
   Ensure your .doc / .docx file is unlocked before submission.

--------------------------------------------------------------------------------
[SAMPLE MANUSCRIPT TITLE PLACEHOLDER]
--------------------------------------------------------------------------------

Author Name 1, Author Name 2
Department of Biological Sciences, University/Institution Name
Email: author@example.edu

ABSTRACT:
Write your 150-250 word abstract here. Ensure all key findings, objectives, methodology, and conclusions are concisely summarized.

KEYWORDS:
Cell Culture, Molecular Biology, In Vitro Assays, Protocol Optimization.

1. INTRODUCTION
Insert your introductory background text here. Standard 12pt font with 1.5 line spacing will automatically maintain an accurate word count calculation (approx 250-300 words per page).

2. MATERIALS AND METHODS
Detail your experimental protocols, reagents, and equipment specifications here.

3. RESULTS AND DISCUSSION
Present data findings, analysis, and interpretation clearly.

4. CONCLUSION
Summarize final key takeaways and future research directions.

REFERENCES
[1] Author, A. A. (Year). Title of article. Title of Periodical, volume number(issue number), pages.
[2] Author, B. B., & Author, C. C. (Year). Title of book. Publisher.
`;

  const blob = new Blob([content], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "CellsInVitro_Standard_Document_Template.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
