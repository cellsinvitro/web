import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { collectUploadedFiles, deleteStoredStudyMaterial, storeStudyMaterialFile, validateUploadedFile } from "../lib/study-materials.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminKitModulesRoutes = new Hono<{ Variables: AuthVariables }>();
adminKitModulesRoutes.use("*", requireAuth, requireAdmin);

adminKitModulesRoutes.get("/", async (c) => c.json({ modules: await prisma.kitModule.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }) }));
async function parseModuleForm(c: Context) {
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const parentId = String(body.parentId ?? "").trim() || null;
  const image = collectUploadedFiles(body).find((file) => file.type.startsWith("image/")) ?? null;
  return { title, description, parentId, image };
}

adminKitModulesRoutes.post("/", async (c) => {
  const { title, description, parentId, image } = await parseModuleForm(c);
  if (!title) throw new HTTPException(400, { message: "Title is required" });
  let imageStorageKey: string | null = null;
  if (image) { const validationError = validateUploadedFile(image); if (validationError) throw new HTTPException(400, { message: validationError }); imageStorageKey = await storeStudyMaterialFile(image.name, image.type, Buffer.from(await image.arrayBuffer())); }
  return c.json({ module: await prisma.kitModule.create({ data: { title, description, parentId, imageStorageKey } }) }, 201);
});
adminKitModulesRoutes.patch("/:id", async (c) => {
  const body = await c.req.parseBody();
  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const description = body.description !== undefined ? String(body.description).trim() || null : undefined;
  const parentId = body.parentId !== undefined ? String(body.parentId).trim() || null : undefined;
  const image = collectUploadedFiles(body).find((file) => file.type.startsWith("image/")) ?? null;
  if (title !== undefined && !title) throw new HTTPException(400, { message: "Title cannot be empty" });
  if (parentId === c.req.param("id")) throw new HTTPException(400, { message: "A module cannot contain itself" });
  const existing = await prisma.kitModule.findUnique({ where: { id: c.req.param("id") } });
  if (!existing) throw new HTTPException(404, { message: "Module not found" });
  let imageStorageKey = existing.imageStorageKey;
  if (image) { const validationError = validateUploadedFile(image); if (validationError) throw new HTTPException(400, { message: validationError }); imageStorageKey = await storeStudyMaterialFile(image.name, image.type, Buffer.from(await image.arrayBuffer())); }
  const module = await prisma.kitModule.update({ where: { id: c.req.param("id") }, data: { ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}), ...(parentId !== undefined ? { parentId } : {}), ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}), ...(image ? { imageStorageKey } : {}) } });
  if (image && existing.imageStorageKey) await deleteStoredStudyMaterial(existing.imageStorageKey);
  return c.json({ module });
});
adminKitModulesRoutes.delete("/:id", async (c) => {
  const module = await prisma.kitModule.findUnique({ where: { id: c.req.param("id") } });
  if (!module) throw new HTTPException(404, { message: "Module not found" });
  await prisma.kitModule.delete({ where: { id: module.id } });
  if (module.imageStorageKey) await deleteStoredStudyMaterial(module.imageStorageKey);
  return c.json({ success: true });
});