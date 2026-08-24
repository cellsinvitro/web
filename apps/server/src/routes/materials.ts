import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  readStudyMaterialFile,
  toPublicStudyMaterial,
} from "../lib/study-materials.js";

export const materialsRoutes = new Hono();

materialsRoutes.get("/", async (c) => {
  const materials = await prisma.studyMaterial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    materials: materials.map(toPublicStudyMaterial),
  });
});

materialsRoutes.get("/:id", async (c) => {
  const material = await prisma.studyMaterial.findUnique({
    where: { id: c.req.param("id") },
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  return c.json({ material: toPublicStudyMaterial(material) });
});

materialsRoutes.get("/:id/view", async (c) => {
  const material = await prisma.studyMaterial.findUnique({
    where: { id: c.req.param("id") },
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  let fileData: Buffer;
  try {
    fileData = await readStudyMaterialFile(material.storageKey);
  } catch {
    throw new HTTPException(404, { message: "Resource file not found" });
  }

  return c.body(new Uint8Array(fileData), 200, {
    "Content-Type": material.mimeType,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
});
