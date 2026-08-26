export const KIT_CATEGORIES = [
  "Anti-Cancer",
  "Anti-Oxidant",
  "Anti-Diabetic",
] as const;

export type KitCategory = (typeof KIT_CATEGORIES)[number];

export function formatKitAssayCount(count: number) {
  return `${count} assay${count === 1 ? "" : "es"}`;
}

export function formatKitDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function assaysToText(assays: string[]) {
  return assays.join("\n");
}

export function parseAssaysText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
