import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  getCloudinaryImageUrl,
  isCloudinaryConfigured,
  toCloudinaryStorageKey,
  uploadImageToCloudinary,
} from "../lib/cloudinary.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect, toPublicUser } from "../lib/user.js";

export const mediaRoutes = new Hono<{ Variables: AuthVariables }>();

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Standard Production Cloudinary Media Asset Registry
 */
export const STATIC_CLOUDINARY_ASSETS = {
  logo: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/brand/logo.png",
  googleIcon: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/brand/google-icon.svg",
  team: {
    drSatyam: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/team/dr-satyam.jpg",
    drMadhunika: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/team/dr-madhunika.jpg",
  },
  kits: {
    antiCancer: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/kits/anti-cancer.png",
    antiOxidant: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/kits/anti-oxidant.png",
    antiDiabetic: "https://res.cloudinary.com/l4h0gysg/image/upload/f_auto,q_auto/cellsinvitro/kits/anti-diabetic.png",
  },
};

/**
 * GET /media/assets
 * Returns public Cloudinary CDN URLs for mobile and web apps.
 */
mediaRoutes.get("/assets", (c) => {
  return c.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "l4h0gysg",
    assets: STATIC_CLOUDINARY_ASSETS,
  });
});

/**
 * POST /media/upload
 * Generic image upload endpoint to Cloudinary.
 */
mediaRoutes.post("/upload", async (c) => {
  if (!isCloudinaryConfigured()) {
    throw new HTTPException(503, {
      message: "Cloudinary is not configured on the server",
    });
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new HTTPException(400, { message: "Multipart form data is required" });
  }

  const file = formData.get("file") || formData.get("image");
  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, {
      message: "An image file ('file' or 'image' field) is required",
    });
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new HTTPException(413, {
      message: `Image must be under ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`,
    });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new HTTPException(415, {
      message: "Only JPEG, PNG, WEBP, and GIF images are allowed",
    });
  }

  const folder = String(formData.get("folder") || "cellsinvitro/uploads");
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const uploadResult = await uploadImageToCloudinary(buffer, { folder });
    const storageKey = toCloudinaryStorageKey(uploadResult.public_id);
    const url = getCloudinaryImageUrl(uploadResult.public_id);

    return c.json({
      success: true,
      url: uploadResult.secure_url || url,
      publicId: uploadResult.public_id,
      storageKey,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload image to Cloudinary";
    throw new HTTPException(500, { message });
  }
});

/**
 * POST /media/avatar
 * Uploads a profile avatar for the authenticated user and updates avatarUrl.
 */
mediaRoutes.post("/avatar", requireAuth, async (c) => {
  if (!isCloudinaryConfigured()) {
    throw new HTTPException(503, {
      message: "Cloudinary is not configured on the server",
    });
  }

  const authUser = c.get("user");
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new HTTPException(400, { message: "Multipart form data is required" });
  }

  const file = formData.get("avatar") || formData.get("image") || formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: "Avatar image file is required" });
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new HTTPException(413, { message: "Avatar image must be under 5 MB" });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new HTTPException(415, {
      message: "Only JPEG, PNG, WEBP, and GIF images are allowed",
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadImageToCloudinary(buffer, {
    folder: "cellsinvitro/avatars",
    publicId: `user_${authUser.sub}`,
  });

  const avatarUrl = uploadResult.secure_url || getCloudinaryImageUrl(uploadResult.public_id);

  const updatedUser = await prisma.user.update({
    where: { id: authUser.sub },
    data: { avatarUrl },
    select: publicUserSelect,
  });

  return c.json({
    success: true,
    avatarUrl,
    user: toPublicUser(updatedUser),
  });
});
