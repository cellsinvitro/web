import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  deleteStudyMaterialFile,
  getFileExtension,
  getMaxFileSize,
  isAllowedMimeType,
  saveStudyMaterialFile,
  toPublicStudyMaterial,
} from "../lib/study-materials.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminMaterialsRoutes = new Hono<{ Variables: AuthVariables }>();

adminMaterialsRoutes.use("*", requireAuth, requireAdmin);

adminMaterialsRoutes.get("/", async (c) => {
  const materials = await prisma.studyMaterial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    materials: materials.map(toPublicStudyMaterial),
  });
});

adminMaterialsRoutes.post("/", async (c) => {
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const category = String(body.category ?? "").trim() || null;
  const file = body.file;

  if (!title) {
    throw new HTTPException(400, { message: "Title is required" });
  }

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "File is required" });
  }

  if (!isAllowedMimeType(file.type)) {
    throw new HTTPException(400, {
      message: "Only PDF and image files are allowed",
    });
  }

  if (file.size <= 0 || file.size > getMaxFileSize()) {
    throw new HTTPException(400, {
      message: "File must be between 1 byte and 15 MB",
    });
  }

  const extension = getFileExtension(file.name, file.type);
  const storageKey = `${randomUUID()}${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await saveStudyMaterialFile(storageKey, fileBuffer);

  try {
    const material = await prisma.studyMaterial.create({
      data: {
        title,
        description,
        category,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storageKey,
      },
    });

    return c.json({ material: toPublicStudyMaterial(material) }, 201);
  } catch (error) {
    await deleteStudyMaterialFile(storageKey);
    throw error;
  }
});

adminMaterialsRoutes.patch("/:id", async (c) => {
  const materialId = c.req.param("id");
  const body = await c.req.parseBody();
  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const description =
    body.description !== undefined
      ? String(body.description).trim() || null
      : undefined;
  const category =
    body.category !== undefined
      ? String(body.category).trim() || null
      : undefined;

  if (title !== undefined && !title) {
    throw new HTTPException(400, { message: "Title cannot be empty" });
  }

  const existing = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  const material = await prisma.studyMaterial.update({
    where: { id: materialId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
    },
  });

  return c.json({ material: toPublicStudyMaterial(material) });
});

adminMaterialsRoutes.delete("/:id", async (c) => {
  const materialId = c.req.param("id");

  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  await prisma.studyMaterial.delete({ where: { id: materialId } });
  await deleteStudyMaterialFile(material.storageKey);

  return c.json({ success: true });
});
