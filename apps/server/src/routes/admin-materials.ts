import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  collectUploadedFiles,
  deleteStoredStudyMaterial,
  storeStudyMaterialFile,
  studyMaterialInclude,
  toPublicStudyMaterial,
  validateUploadedFile,
} from "../lib/study-materials.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminMaterialsRoutes = new Hono<{ Variables: AuthVariables }>();

adminMaterialsRoutes.use("*", requireAuth, requireAdmin);

adminMaterialsRoutes.get("/", async (c) => {
  const materials = await prisma.studyMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: studyMaterialInclude,
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
  const uploadedFiles = collectUploadedFiles(body);

  if (!title) {
    throw new HTTPException(400, { message: "Title is required" });
  }

  if (uploadedFiles.length === 0) {
    throw new HTTPException(400, { message: "At least one file is required" });
  }

  for (const file of uploadedFiles) {
    const validationError = validateUploadedFile(file);
    if (validationError) {
      throw new HTTPException(400, { message: validationError });
    }
  }

  const storedFiles: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  }> = [];
  const storedKeys: string[] = [];

  try {
    for (const file of uploadedFiles) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const storageKey = await storeStudyMaterialFile(
        file.name,
        file.type,
        fileBuffer
      );
      storedKeys.push(storageKey);
      storedFiles.push({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storageKey,
      });
    }
  } catch (error) {
    for (const storageKey of storedKeys) {
      await deleteStoredStudyMaterial(storageKey);
    }
    const message =
      error instanceof Error ? error.message : "Failed to store uploaded files";
    throw new HTTPException(500, { message });
  }

  try {
    const material = await prisma.studyMaterial.create({
      data: {
        title,
        description,
        category,
        files: {
          create: storedFiles,
        },
      },
      include: studyMaterialInclude,
    });

    return c.json({ material: toPublicStudyMaterial(material) }, 201);
  } catch (error) {
    for (const storageKey of storedKeys) {
      await deleteStoredStudyMaterial(storageKey);
    }
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
    include: studyMaterialInclude,
  });

  return c.json({ material: toPublicStudyMaterial(material) });
});

adminMaterialsRoutes.post("/:id/files", async (c) => {
  const materialId = c.req.param("id");
  const body = await c.req.parseBody();
  const uploadedFiles = collectUploadedFiles(body);

  if (uploadedFiles.length === 0) {
    throw new HTTPException(400, { message: "At least one file is required" });
  }

  for (const file of uploadedFiles) {
    const validationError = validateUploadedFile(file);
    if (validationError) {
      throw new HTTPException(400, { message: validationError });
    }
  }

  const existing = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  const storedKeys: string[] = [];
  const createdFileIds: string[] = [];

  try {
    for (const file of uploadedFiles) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const storageKey = await storeStudyMaterialFile(
        file.name,
        file.type,
        fileBuffer
      );
      storedKeys.push(storageKey);

      const created = await prisma.studyMaterialFile.create({
        data: {
          materialId,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          storageKey,
        },
      });
      createdFileIds.push(created.id);
    }
  } catch (error) {
    for (const fileId of createdFileIds) {
      await prisma.studyMaterialFile.delete({ where: { id: fileId } });
    }
    for (const storageKey of storedKeys) {
      await deleteStoredStudyMaterial(storageKey);
    }
    const message =
      error instanceof Error ? error.message : "Failed to store uploaded files";
    throw new HTTPException(500, { message });
  }

  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
    include: studyMaterialInclude,
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  return c.json({ material: toPublicStudyMaterial(material) });
});

adminMaterialsRoutes.delete("/:id/files/:fileId", async (c) => {
  const materialId = c.req.param("id");
  const fileId = c.req.param("fileId");

  const file = await prisma.studyMaterialFile.findFirst({
    where: { id: fileId, materialId },
  });

  if (!file) {
    throw new HTTPException(404, { message: "Resource file not found" });
  }

  const remainingCount = await prisma.studyMaterialFile.count({
    where: { materialId },
  });

  if (remainingCount <= 1) {
    throw new HTTPException(400, {
      message: "A resource must contain at least one file",
    });
  }

  await prisma.studyMaterialFile.delete({ where: { id: fileId } });
  await deleteStoredStudyMaterial(file.storageKey);

  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
    include: studyMaterialInclude,
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  return c.json({ material: toPublicStudyMaterial(material) });
});

adminMaterialsRoutes.delete("/:id", async (c) => {
  const materialId = c.req.param("id");

  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
    include: studyMaterialInclude,
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  await prisma.studyMaterial.delete({ where: { id: materialId } });

  for (const file of material.files) {
    await deleteStoredStudyMaterial(file.storageKey);
  }

  return c.json({ success: true });
});
