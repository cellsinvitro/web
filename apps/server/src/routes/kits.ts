import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { readStudyMaterialFile } from "../lib/study-materials.js";
import { isCloudinaryStorageKey } from "../lib/cloudinary.js";
import { toPublicKit } from "../lib/kits.js";

export const kitsRoutes = new Hono();

function getApiBaseUrl(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

kitsRoutes.get("/", async (c) => {
  const kits = await prisma.researchKit.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const apiBaseUrl = getApiBaseUrl(c);
  return c.json({
    kits: kits.map((kit) => toPublicKit(kit, apiBaseUrl)),
  });
});

kitsRoutes.get("/images/:storageKey", async (c) => {
  const storageKey = decodeURIComponent(c.req.param("storageKey"));

  if (isCloudinaryStorageKey(storageKey)) {
    throw new HTTPException(404, { message: "Kit image not found" });
  }

  let fileData: Buffer;
  try {
    fileData = await readStudyMaterialFile(storageKey);
  } catch {
    throw new HTTPException(404, { message: "Kit image not found" });
  }

  const extension = storageKey.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "gif"
          ? "image/gif"
          : "image/jpeg";

  return new Response(fileData, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

kitsRoutes.get("/:id", async (c) => {
  const kit = await prisma.researchKit.findFirst({
    where: { id: c.req.param("id"), published: true },
  });

  if (!kit) {
    throw new HTTPException(404, { message: "Kit not found" });
  }

  return c.json({ kit: toPublicKit(kit, getApiBaseUrl(c)) });
});
