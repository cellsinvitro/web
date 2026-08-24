import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deleteCloudinaryImage,
  isCloudinaryConfigured,
  isCloudinaryStorageKey,
  getCloudinaryPublicId,
  toCloudinaryStorageKey,
  uploadImageToCloudinary,
} from "./cloudinary.js";

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

export function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
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

export async function storeStudyMaterialFile(
  fileName: string,
  mimeType: string,
  data: Buffer
) {
  if (isImageMimeType(mimeType)) {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "Image uploads require Cloudinary. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      );
    }

    const uploadResult = await uploadImageToCloudinary(data);
    return toCloudinaryStorageKey(uploadResult.public_id);
  }

  const extension = getFileExtension(fileName, mimeType);
  const storageKey = `${randomUUID()}${extension}`;
  await saveStudyMaterialFile(storageKey, data);
  return storageKey;
}

export async function deleteStoredStudyMaterial(storageKey: string) {
  if (isCloudinaryStorageKey(storageKey)) {
    await deleteCloudinaryImage(getCloudinaryPublicId(storageKey));
  } else {
    await deleteStudyMaterialFile(storageKey);
  }
}

export function toPublicStudyMaterialFile(file: {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

export function toPublicStudyMaterial(material: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  createdAt: Date;
  updatedAt: Date;
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  return {
    id: material.id,
    title: material.title,
    description: material.description,
    category: material.category,
    files: material.files.map(toPublicStudyMaterialFile),
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

export const studyMaterialInclude = {
  files: {
    orderBy: { createdAt: "asc" as const },
  },
};

export function collectUploadedFiles(
  body: Record<string, unknown>
) {
  const files: File[] = [];

  for (const value of Object.values(body)) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry instanceof File && entry.size > 0) {
          files.push(entry);
        }
      }
    }
  }

  return files;
}

export function validateUploadedFile(file: File) {
  if (!isAllowedMimeType(file.type)) {
    return "Only PDF and image files are allowed";
  }

  if (file.size <= 0 || file.size > getMaxFileSize()) {
    return "Each file must be between 1 byte and 15 MB";
  }

  return null;
}
