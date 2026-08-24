import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(serverRoot, "uploads", "study-materials");

export function isAllowedMimeType(mimeType: string) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function getMaxFileSize() {
  return MAX_FILE_SIZE;
}

export function getFileExtension(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName) {
    return fromName;
  }

  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveStudyMaterialFile(
  storageKey: string,
  data: Buffer
) {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, storageKey);
  await writeFile(filePath, data);
}

export async function readStudyMaterialFile(storageKey: string) {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  return readFile(filePath);
}

export async function deleteStudyMaterialFile(storageKey: string) {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  try {
    await unlink(filePath);
  } catch {
    // Ignore missing files during cleanup.
  }
}

export function toPublicStudyMaterial(material: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: material.id,
    title: material.title,
    description: material.description,
    category: material.category,
    fileName: material.fileName,
    mimeType: material.mimeType,
    fileSize: material.fileSize,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}
