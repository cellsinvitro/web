import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  fetchCloudinaryImage,
  getCloudinaryPublicId,
  isCloudinaryStorageKey,
} from "../lib/cloudinary.js";
import {
  readStudyMaterialFile,
  studyMaterialInclude,
  toPublicStudyMaterial,
} from "../lib/study-materials.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const materialsRoutes = new Hono<{ Variables: AuthVariables }>();

materialsRoutes.use("*", requireAuth);

materialsRoutes.get("/", async (c) => {
  const materials = await prisma.studyMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: studyMaterialInclude,
  });

  return c.json({
    materials: materials.map(toPublicStudyMaterial),
  });
});

materialsRoutes.get("/:materialId/files/:fileId/view", async (c) => {
  const materialId = c.req.param("materialId");
  const fileId = c.req.param("fileId");

  const file = await prisma.studyMaterialFile.findFirst({
    where: { id: fileId, materialId },
  });

  if (!file) {
    throw new HTTPException(404, { message: "Resource file not found" });
  }

  let fileData: Buffer;
  try {
    if (isCloudinaryStorageKey(file.storageKey)) {
      fileData = await fetchCloudinaryImage(getCloudinaryPublicId(file.storageKey));
    } else {
      fileData = await readStudyMaterialFile(file.storageKey);
    }
  } catch {
    throw new HTTPException(404, { message: "Resource file not found" });
  }

  return new Response(fileData, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

materialsRoutes.get("/:id", async (c) => {
  const material = await prisma.studyMaterial.findUnique({
    where: { id: c.req.param("id") },
    include: studyMaterialInclude,
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  return c.json({ material: toPublicStudyMaterial(material) });
});
