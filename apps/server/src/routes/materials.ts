import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  fetchCloudinaryImage,
  getCloudinaryPublicId,
  isCloudinaryStorageKey,
} from "../lib/cloudinary.js";
import {
  getResourceLibrarySetting,
  getUserAccessInfo,
  readStudyMaterialFile,
  studyMaterialInclude,
  toPublicStudyMaterial,
  toPublicStudyMaterialFile,
} from "../lib/study-materials.js";
import { getAccessTokenFromRequest } from "../lib/cookies.js";
import { verifyAccessToken } from "../lib/jwt.js";

export const materialsRoutes = new Hono();

async function getRequestUser(c: any) {
  const token = getAccessTokenFromRequest(c);
  if (!token) return null;
  try {
    const user = await verifyAccessToken(token);
    return user;
  } catch {
    return null;
  }
}

materialsRoutes.get("/", async (c) => {
  const user = await getRequestUser(c);
  const userAccess = await getUserAccessInfo(user?.sub, (user as any)?.role);
  const librarySetting = await getResourceLibrarySetting();

  const materials = await prisma.studyMaterial.findMany({
    orderBy: { createdAt: "desc" },
    include: studyMaterialInclude,
  });

  return c.json({
    libraryPrice: librarySetting.price,
    libraryOriginalPrice: librarySetting.originalPrice,
    materials: materials.map((material) =>
      toPublicStudyMaterial(material, librarySetting.price, userAccess)
    ),
  });
});

async function loadStudyMaterialFileBuffer(
  c: any,
  materialId: string,
  fileId: string,
  requireAccess: boolean = true
) {
  const material = await prisma.studyMaterial.findUnique({
    where: { id: materialId },
  });
  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  const file = await prisma.studyMaterialFile.findFirst({
    where: { id: fileId, materialId },
  });

  if (!file) {
    throw new HTTPException(404, { message: "Resource file not found" });
  }

  const user = await getRequestUser(c);
  const userAccess = await getUserAccessInfo(user?.sub, (user as any)?.role);
  const librarySetting = await getResourceLibrarySetting();

  const filePublic = toPublicStudyMaterialFile(
    file,
    material.price,
    librarySetting.price,
    userAccess
  );

  if (requireAccess && !filePublic.hasAccess) {
    throw new HTTPException(403, {
      message: "Purchase required to download this resource",
    });
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

  return { file, fileData, user, hasAccess: filePublic.hasAccess };
}

function contentDispositionAttachment(fileName: string) {
  const safe = fileName.replace(/[^\w.\- ()]/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

materialsRoutes.get("/:materialId/files/:fileId/view", async (c) => {
  const { file, fileData } = await loadStudyMaterialFileBuffer(
    c,
    c.req.param("materialId"),
    c.req.param("fileId"),
    false
  );

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

materialsRoutes.get("/:materialId/files/:fileId/download", async (c) => {
  const { file, fileData, user } = await loadStudyMaterialFileBuffer(
    c,
    c.req.param("materialId"),
    c.req.param("fileId"),
    true
  );

  if (user) {
    try {
      await prisma.studyMaterialDownload.create({
        data: {
          userId: user.sub,
          fileId: file.id,
        },
      });
    } catch {
      // Ignore download tracking error
    }
  }

  return new Response(fileData, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": contentDispositionAttachment(file.fileName),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

materialsRoutes.get("/:id", async (c) => {
  const user = await getRequestUser(c);
  const userAccess = await getUserAccessInfo(user?.sub, (user as any)?.role);
  const librarySetting = await getResourceLibrarySetting();

  const material = await prisma.studyMaterial.findUnique({
    where: { id: c.req.param("id") },
    include: studyMaterialInclude,
  });

  if (!material) {
    throw new HTTPException(404, { message: "Resource not found" });
  }

  return c.json({
    libraryPrice: librarySetting.price,
    material: toPublicStudyMaterial(material, librarySetting.price, userAccess),
  });
});
