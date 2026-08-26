import {
  getCloudinaryImageUrl,
  getCloudinaryPublicId,
  isCloudinaryStorageKey,
} from "./cloudinary.js";
import {
  deleteStoredStudyMaterial,
  isImageMimeType,
  storeStudyMaterialFile,
} from "./study-materials.js";

export const KIT_CATEGORIES = [
  "Anti-Cancer",
  "Anti-Oxidant",
  "Anti-Diabetic",
] as const;

export type KitCategory = (typeof KIT_CATEGORIES)[number];

export function isKitCategory(value: string): value is KitCategory {
  return KIT_CATEGORIES.includes(value as KitCategory);
}

export function parseAssaysInput(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return [];
  }

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      }
    } catch {
      // Fall through to line-based parsing.
    }
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveKitImageUrl(
  imageStorageKey: string | null,
  apiBaseUrl = ""
) {
  if (!imageStorageKey) {
    return null;
  }

  if (
    imageStorageKey.startsWith("/") ||
    imageStorageKey.startsWith("http://") ||
    imageStorageKey.startsWith("https://")
  ) {
    return imageStorageKey;
  }

  if (isCloudinaryStorageKey(imageStorageKey)) {
    return getCloudinaryImageUrl(getCloudinaryPublicId(imageStorageKey));
  }

  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/kits/images/${encodeURIComponent(imageStorageKey)}`;
}

export function toPublicKit(
  kit: {
    id: string;
    title: string;
    category: string;
    imageStorageKey: string | null;
    assays: string[];
    published: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  apiBaseUrl = ""
) {
  return {
    id: kit.id,
    title: kit.title,
    category: kit.category,
    imageUrl: resolveKitImageUrl(kit.imageStorageKey, apiBaseUrl),
    assays: kit.assays,
    published: kit.published,
    sortOrder: kit.sortOrder,
    createdAt: kit.createdAt.toISOString(),
    updatedAt: kit.updatedAt.toISOString(),
  };
}

export function validateKitImage(file: File) {
  if (!isImageMimeType(file.type)) {
    return "Only image files are allowed";
  }

  if (file.size <= 0 || file.size > 15 * 1024 * 1024) {
    return "Image must be between 1 byte and 15 MB";
  }

  return null;
}

export async function storeKitImage(
  fileName: string,
  mimeType: string,
  data: Buffer
) {
  return storeStudyMaterialFile(fileName, mimeType, data);
}

export async function deleteStoredKitImage(imageStorageKey: string | null) {
  if (!imageStorageKey) {
    return;
  }

  if (
    imageStorageKey.startsWith("/") ||
    imageStorageKey.startsWith("http://") ||
    imageStorageKey.startsWith("https://")
  ) {
    return;
  }

  await deleteStoredStudyMaterial(imageStorageKey);
}

export function parsePublishedInput(value: unknown, fallback = true) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

export function parseSortOrderInput(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
