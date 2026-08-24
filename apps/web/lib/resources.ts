export function formatResourceDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getResourceTypeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  return "File";
}

export function getMaterialFileCountLabel(count: number) {
  return `${count} file${count !== 1 ? "s" : ""}`;
}

export function getMaterialTypeSummary(
  files: Array<{ mimeType: string }>
) {
  const hasPdf = files.some((file) => file.mimeType === "application/pdf");
  const hasImage = files.some((file) => file.mimeType.startsWith("image/"));

  if (hasPdf && hasImage) return "Mixed";
  if (hasPdf) return "PDF";
  if (hasImage) return "Images";
  return "Files";
}

export function getMaterialTotalSize(files: Array<{ fileSize: number }>) {
  return files.reduce((total, file) => total + file.fileSize, 0);
}
