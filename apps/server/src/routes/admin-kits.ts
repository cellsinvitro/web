import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  collectUploadedFiles,
} from "../lib/study-materials.js";
import {
  deleteStoredKitImage,
  isKitCategory,
  parseAssaysInput,
  parsePublishedInput,
  parseSortOrderInput,
  storeKitImage,
  toPublicKit,
  validateKitImage,
} from "../lib/kits.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminKitsRoutes = new Hono<{ Variables: AuthVariables }>();

adminKitsRoutes.use("*", requireAuth, requireAdmin);

function getApiBaseUrl(c: { req: { url: string } }) {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

function getSingleUploadedImage(body: Record<string, unknown>) {
  const files = collectUploadedFiles(body).filter((file) =>
    file.type.startsWith("image/")
  );
  return files[0] ?? null;
}

adminKitsRoutes.get("/", async (c) => {
  const kits = await prisma.researchKit.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const apiBaseUrl = getApiBaseUrl(c);
  return c.json({
    kits: kits.map((kit) => toPublicKit(kit, apiBaseUrl)),
  });
});

adminKitsRoutes.post("/", async (c) => {
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const assays = parseAssaysInput(body.assays);
  const published = parsePublishedInput(body.published, true);
  const sortOrder = parseSortOrderInput(body.sortOrder, 0);
  const image = getSingleUploadedImage(body);

  if (!title) {
    throw new HTTPException(400, { message: "Title is required" });
  }

  if (!isKitCategory(category)) {
    throw new HTTPException(400, { message: "A valid category is required" });
  }

  if (assays.length === 0) {
    throw new HTTPException(400, { message: "At least one assay is required" });
  }

  if (!image) {
    throw new HTTPException(400, { message: "A kit image is required" });
  }

  const validationError = validateKitImage(image);
  if (validationError) {
    throw new HTTPException(400, { message: validationError });
  }

  let imageStorageKey: string | null = null;
  try {
    const fileBuffer = Buffer.from(await image.arrayBuffer());
    imageStorageKey = await storeKitImage(image.name, image.type, fileBuffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store kit image";
    throw new HTTPException(500, { message });
  }

  try {
    const kit = await prisma.researchKit.create({
      data: {
        title,
        category,
        assays,
        published,
        sortOrder,
        imageStorageKey,
      },
    });

    return c.json({ kit: toPublicKit(kit, getApiBaseUrl(c)) }, 201);
  } catch (error) {
    await deleteStoredKitImage(imageStorageKey);
    throw error;
  }
});

adminKitsRoutes.patch("/:id", async (c) => {
  const kitId = c.req.param("id");
  const body = await c.req.parseBody();
  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const category =
    body.category !== undefined ? String(body.category).trim() : undefined;
  const assays =
    body.assays !== undefined ? parseAssaysInput(body.assays) : undefined;
  const published =
    body.published !== undefined
      ? parsePublishedInput(body.published, true)
      : undefined;
  const sortOrder =
    body.sortOrder !== undefined
      ? parseSortOrderInput(body.sortOrder, 0)
      : undefined;
  const image = getSingleUploadedImage(body);

  if (title !== undefined && !title) {
    throw new HTTPException(400, { message: "Title cannot be empty" });
  }

  if (category !== undefined && !isKitCategory(category)) {
    throw new HTTPException(400, { message: "A valid category is required" });
  }

  if (assays !== undefined && assays.length === 0) {
    throw new HTTPException(400, { message: "At least one assay is required" });
  }

  const existing = await prisma.researchKit.findUnique({
    where: { id: kitId },
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Kit not found" });
  }

  let nextImageStorageKey = existing.imageStorageKey;
  let storedImageKey: string | null = null;

  if (image) {
    const validationError = validateKitImage(image);
    if (validationError) {
      throw new HTTPException(400, { message: validationError });
    }

    try {
      const fileBuffer = Buffer.from(await image.arrayBuffer());
      storedImageKey = await storeKitImage(image.name, image.type, fileBuffer);
      nextImageStorageKey = storedImageKey;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to store kit image";
      throw new HTTPException(500, { message });
    }
  }

  try {
    const kit = await prisma.researchKit.update({
      where: { id: kitId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(assays !== undefined ? { assays } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(image ? { imageStorageKey: nextImageStorageKey } : {}),
      },
    });

    if (storedImageKey && existing.imageStorageKey !== storedImageKey) {
      await deleteStoredKitImage(existing.imageStorageKey);
    }

    return c.json({ kit: toPublicKit(kit, getApiBaseUrl(c)) });
  } catch (error) {
    if (storedImageKey) {
      await deleteStoredKitImage(storedImageKey);
    }
    throw error;
  }
});

adminKitsRoutes.delete("/:id", async (c) => {
  const kitId = c.req.param("id");

  const kit = await prisma.researchKit.findUnique({
    where: { id: kitId },
  });

  if (!kit) {
    throw new HTTPException(404, { message: "Kit not found" });
  }

  await prisma.researchKit.delete({ where: { id: kitId } });
  await deleteStoredKitImage(kit.imageStorageKey);

  return c.json({ success: true });
});
