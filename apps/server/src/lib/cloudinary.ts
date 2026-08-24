import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const CLOUDINARY_PREFIX = "cloudinary:";
const UPLOAD_FOLDER = "cellsinvitro/study-materials";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null;
}

export function isCloudinaryStorageKey(storageKey: string) {
  return storageKey.startsWith(CLOUDINARY_PREFIX);
}

export function toCloudinaryStorageKey(publicId: string) {
  return `${CLOUDINARY_PREFIX}${publicId}`;
}

export function getCloudinaryPublicId(storageKey: string) {
  return storageKey.slice(CLOUDINARY_PREFIX.length);
}

function configureCloudinary() {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
}

export async function uploadImageToCloudinary(data: Buffer) {
  configureCloudinary();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDER,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(data);
  });
}

export function getCloudinaryImageUrl(publicId: string) {
  configureCloudinary();
  return cloudinary.url(publicId, { secure: true });
}

export async function fetchCloudinaryImage(publicId: string) {
  const imageUrl = getCloudinaryImageUrl(publicId);
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from Cloudinary (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteCloudinaryImage(publicId: string) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
