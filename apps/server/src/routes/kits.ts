import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { readStudyMaterialFile } from "../lib/study-materials.js";
import { isCloudinaryStorageKey } from "../lib/cloudinary.js";
import { resolveKitModuleImageUrl, toPublicKit } from "../lib/kits.js";

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

kitsRoutes.get("/tree", async (c) => {
  const [modules, kits] = await Promise.all([
    prisma.kitModule.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.researchKit.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const apiBaseUrl = getApiBaseUrl(c);
  const nodes = new Map(modules.map((module) => [module.id, { ...module, imageUrl: resolveKitModuleImageUrl(module.imageStorageKey, apiBaseUrl), children: [] as unknown[], kits: [] as unknown[] }]));
  const roots: Array<(typeof nodes extends Map<string, infer Value> ? Value : never)> = [];
  for (const module of modules) {
    const node = nodes.get(module.id);
    const parent = module.parentId ? nodes.get(module.parentId) : undefined;
    if (node) (parent?.children ?? roots).push(node);
  }
  for (const kit of kits) {
    const node = kit.moduleId ? nodes.get(kit.moduleId) : undefined;
    if (node) node.kits.push(toPublicKit(kit, apiBaseUrl));
  }
  const sort = (items: typeof roots) => { items.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)); for (const item of items) sort(item.children as typeof roots); };
  sort(roots);
  return c.json({ tree: roots });
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
