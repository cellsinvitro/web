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
import { v2 as cloudinary } from "cloudinary";

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const COURSE_UPLOAD_FOLDER = "cellsinvitro/courses";
const VIDEO_UPLOAD_FOLDER = "cellsinvitro/course-videos";

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const COURSE_UPLOAD_DIR =
  process.env.COURSE_UPLOAD_DIR ||
  path.join(serverRoot, "uploads", "course-content");

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export function isVideoMimeType(mimeType: string) {
  return VIDEO_MIME_TYPES.has(mimeType);
}

export function isDocumentMimeType(mimeType: string) {
  return DOCUMENT_MIME_TYPES.has(mimeType);
}

export function isCourseImageMimeType(mimeType: string) {
  return IMAGE_MIME_TYPES.has(mimeType);
}

export function validateCourseFile(file: File, contentType: string) {
  if (contentType === "VIDEO") {
    if (!isVideoMimeType(file.type)) {
      return "Only MP4, WebM, or MOV video files are allowed";
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_SIZE) {
      return "Video must be between 1 byte and 500 MB";
    }
    return null;
  }

  if (contentType === "PDF") {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
      return "PDF must be between 1 byte and 50 MB";
    }
    return null;
  }

  if (contentType === "PPT") {
    if (!DOCUMENT_MIME_TYPES.has(file.type) || file.type === "application/pdf") {
      return "Only PowerPoint files (.ppt, .pptx) are allowed";
    }
    if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
      return "PPT must be between 1 byte and 50 MB";
    }
    return null;
  }

  if (contentType === "IMAGE") {
    if (!isCourseImageMimeType(file.type)) {
      return "Only JPEG, PNG, WebP, or GIF images are allowed";
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return "Image must be between 1 byte and 15 MB";
    }
    return null;
  }

  if (isCourseImageMimeType(file.type)) {
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return "Image must be between 1 byte and 15 MB";
    }
    return null;
  }

  return "Unsupported file type";
}

async function ensureUploadDir() {
  await mkdir(COURSE_UPLOAD_DIR, { recursive: true });
}

export async function saveLocalCourseFile(storageKey: string, data: Buffer) {
  await ensureUploadDir();
  await writeFile(path.join(COURSE_UPLOAD_DIR, storageKey), data);
}

export async function readLocalCourseFile(storageKey: string) {
  return readFile(path.join(COURSE_UPLOAD_DIR, storageKey));
}

export async function deleteLocalCourseFile(storageKey: string) {
  try {
    await unlink(path.join(COURSE_UPLOAD_DIR, storageKey));
  } catch {
    // ignore missing files
  }
}

export async function uploadVideoToCloudinary(data: Buffer) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Video uploads require Cloudinary configuration");
  }
  configureCloudinary();

  return new Promise<{ public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: VIDEO_UPLOAD_FOLDER, resource_type: "video" },
      (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error("No upload result"));
        else resolve(result);
      }
    );
    uploadStream.end(data);
  });
}

export function createVideoUploadSignature(timestamp: number, publicId: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const paramsToSign = { folder: VIDEO_UPLOAD_FOLDER, public_id: publicId, timestamp };
  return {
    cloudName,
    apiKey,
    publicId,
    folder: VIDEO_UPLOAD_FOLDER,
    timestamp,
    signature: cloudinary.utils.api_sign_request(paramsToSign, apiSecret),
  };
}

export function getSignedVideoUrl(publicId: string, expiresInSeconds = 3600) {
  configureCloudinary();
  return cloudinary.url(publicId, {
    resource_type: "video",
    secure: true,
    sign_url: true,
    type: "upload",
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

export async function deleteCloudinaryVideo(publicId: string) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
}

export function getFileExtension(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (fromName) return fromName;
  switch (mimeType) {
    case "application/pdf": return ".pdf";
    case "video/mp4": return ".mp4";
    case "video/webm": return ".webm";
    case "video/quicktime": return ".mov";
    case "application/vnd.ms-powerpoint": return ".ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation": return ".pptx";
    default: return "";
  }
}

export async function storeCourseContentFile(
  fileName: string,
  mimeType: string,
  data: Buffer,
  contentType: string
) {
  if (contentType === "VIDEO") {
    const result = await uploadVideoToCloudinary(data);
    return {
      storageKey: `video:${result.public_id}`,
      fileName,
      mimeType,
      fileSize: data.length,
    };
  }

  if (isCourseImageMimeType(mimeType)) {
    if (!isCloudinaryConfigured()) {
      throw new Error("Image uploads require Cloudinary");
    }
    const result = await uploadImageToCloudinary(data);
    return {
      storageKey: toCloudinaryStorageKey(result.public_id),
      fileName,
      mimeType,
      fileSize: data.length,
    };
  }

  const extension = getFileExtension(fileName, mimeType);
  const storageKey = `${randomUUID()}${extension}`;
  await saveLocalCourseFile(storageKey, data);
  return { storageKey, fileName, mimeType, fileSize: data.length };
}

export async function storeCourseThumbnail(fileName: string, mimeType: string, data: Buffer) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Thumbnail uploads require Cloudinary");
  }
  configureCloudinary();
  const result = await new Promise<{ public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: COURSE_UPLOAD_FOLDER, resource_type: "image" },
      (error, uploadResult) => {
        if (error) reject(error);
        else if (!uploadResult) reject(new Error("No upload result"));
        else resolve(uploadResult);
      }
    );
    uploadStream.end(data);
  });
  return toCloudinaryStorageKey(result.public_id);
}

export async function deleteStoredCourseContent(storageKey: string) {
  if (storageKey.startsWith("video:")) {
    await deleteCloudinaryVideo(storageKey.slice(6));
  } else if (isCloudinaryStorageKey(storageKey)) {
    await deleteCloudinaryImage(getCloudinaryPublicId(storageKey));
  } else {
    await deleteLocalCourseFile(storageKey);
  }
}

export function isVideoStorageKey(storageKey: string) {
  return storageKey.startsWith("video:");
}

export function getVideoPublicId(storageKey: string) {
  return storageKey.slice(6);
}

export async function readStoredCourseContent(storageKey: string) {
  if (isVideoStorageKey(storageKey)) {
    throw new Error("Videos must be streamed, not read directly");
  }
  if (isCloudinaryStorageKey(storageKey)) {
    const { fetchCloudinaryImage } = await import("./cloudinary.js");
    return fetchCloudinaryImage(getCloudinaryPublicId(storageKey));
  }
  return readLocalCourseFile(storageKey);
}

export function collectUploadedFile(body: Record<string, unknown>, fieldName = "file") {
  const value = body[fieldName];
  if (value instanceof File && value.size > 0) return value;
  return null;
}
