export const DESIGNATION_OPTIONS = [
  { value: "PHD", label: "PhD" },
  { value: "MD", label: "MD" },
  { value: "MSC", label: "MSc" },
  { value: "BSC", label: "BSc" },
  { value: "BTECH", label: "BTech" },
  { value: "MTECH", label: "MTech" },
  { value: "POSTDOC", label: "Postdoctoral Fellow" },
  { value: "PROFESSOR", label: "Professor" },
  { value: "RESEARCH_SCIENTIST", label: "Research Scientist" },
  { value: "GRADUATE_STUDENT", label: "Graduate Student" },
  { value: "UNDERGRADUATE", label: "Undergraduate" },
  { value: "OTHER", label: "Other" },
] as const;

export type Designation = (typeof DESIGNATION_OPTIONS)[number]["value"];

export function getDesignationLabel(value: string | null | undefined) {
  if (!value) return null;
  return DESIGNATION_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
