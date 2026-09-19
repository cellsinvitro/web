import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const stockRoutes = new Hono<{ Variables: AuthVariables }>();

stockRoutes.use("*", requireAuth);

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: "Chemical", sortOrder: 0 },
  { name: "Culture Ware", sortOrder: 1 },
  { name: "Plastic Ware", sortOrder: 2 },
  { name: "Glassware", sortOrder: 3 },
  { name: "Apparatus", sortOrder: 4 },
  { name: "Others", sortOrder: 5 },
];

const DEFAULT_TAGS = [
  { name: "Cell Culture", sortOrder: 0 },
  { name: "DNA", sortOrder: 1 },
  { name: "RNA", sortOrder: 2 },
  { name: "Genomics", sortOrder: 3 },
  { name: "Proteomics", sortOrder: 4 },
  { name: "Extraction", sortOrder: 5 },
  { name: "PCR", sortOrder: 6 },
  { name: "Protein Analysis", sortOrder: 7 },
  { name: "Microscopy", sortOrder: 8 },
  { name: "General Laboratory", sortOrder: 9 },
];

const DEFAULT_LOCATIONS = [
  { name: "Main Store", sortOrder: 0, children: ["Shelf A", "Shelf B", "Shelf C"] },
  { name: "Refrigerator (2-8°C)", sortOrder: 1, children: ["Rack 1", "Rack 2", "Rack 3"] },
  { name: "Deep Freezer (-20°C)", sortOrder: 2, children: ["Rack A", "Rack B"] },
  { name: "Deep Freezer (-80°C)", sortOrder: 3, children: ["Rack A", "Rack B"] },
  { name: "Almira", sortOrder: 4, children: [] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireStockPermission(
  labId: string,
  userId: string,
  permission: "canViewStock" | "canAddStock" | "canEditStock" | "canIssueStock" | "canRestockStock" | "canManageStockSettings"
) {
  const workspace = await prisma.labWorkspace.findUnique({
    where: { id: labId },
    select: { ownerId: true },
  });
  if (!workspace) throw new HTTPException(404, { message: "Lab not found" });

  // Owner always has full access
  if (workspace.ownerId === userId) return true;

  const member = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId } },
  });
  if (!member) throw new HTTPException(403, { message: "Not a member of this lab" });

  // OWNER/ADMIN roles have full access
  if (member.role === "OWNER" || member.role === "ADMIN") return true;

  if (!member[permission]) {
    throw new HTTPException(403, { message: `Permission denied: ${permission}` });
  }
  return true;
}

async function getStockPermissions(labId: string, userId: string) {
  const workspace = await prisma.labWorkspace.findUnique({
    where: { id: labId },
    select: { ownerId: true },
  });
  if (!workspace) return null;

  if (workspace.ownerId === userId) {
    return {
      canViewStock: true, canAddStock: true, canEditStock: true,
      canIssueStock: true, canRestockStock: true, canManageStockSettings: true,
    };
  }

  const member = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId } },
  });
  if (!member) return null;

  if (member.role === "OWNER" || member.role === "ADMIN") {
    return {
      canViewStock: true, canAddStock: true, canEditStock: true,
      canIssueStock: true, canRestockStock: true, canManageStockSettings: true,
    };
  }

  return {
    canViewStock: member.canViewStock,
    canAddStock: member.canAddStock,
    canEditStock: member.canEditStock,
    canIssueStock: member.canIssueStock,
    canRestockStock: member.canRestockStock,
    canManageStockSettings: member.canManageStockSettings,
  };
}

function computeStockStatus(
  currentQty: number,
  expiryDate: Date | null,
  lowStockThreshold: number,
  nearExpiryDays: number
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) return "EXPIRED";
    const nearExpiryDate = new Date(today);
    nearExpiryDate.setDate(nearExpiryDate.getDate() + nearExpiryDays);
    if (expiry <= nearExpiryDate) return "EXPIRING_SOON";
  }

  if (currentQty === 0) return "OUT_OF_STOCK";
  if (currentQty <= lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

// ─── Bootstrap / Init ─────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/init", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  const permissions = await getStockPermissions(labId, userId);
  if (!permissions) throw new HTTPException(404, { message: "Lab not found or not a member" });
  if (!permissions.canViewStock) throw new HTTPException(403, { message: "No stock access" });

  let settings = await prisma.stockSettings.findUnique({ where: { labId } });
  if (!settings) {
    settings = await prisma.stockSettings.create({ data: { labId } });
  }

  const catCount = await prisma.stockCategory.count({ where: { labId } });
  if (catCount === 0) {
    await prisma.stockCategory.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({ ...cat, labId, isDefault: true })),
    });
  }

  const tagCount = await prisma.stockTag.count({ where: { labId } });
  if (tagCount === 0) {
    await prisma.stockTag.createMany({
      data: DEFAULT_TAGS.map((t) => ({ ...t, labId, isDefault: true })),
    });
  }

  const locCount = await prisma.location.count({ where: { labId } });
  if (locCount === 0) {
    for (const loc of DEFAULT_LOCATIONS) {
      const parent = await prisma.location.create({
        data: { labId, name: loc.name, sortOrder: loc.sortOrder, isDefault: true },
      });
      if (loc.children.length > 0) {
        await prisma.location.createMany({
          data: loc.children.map((name, idx) => ({
            labId, name, parentId: parent.id, sortOrder: idx, isDefault: true,
          })),
        });
      }
    }
  }

  return c.json({ settings, permissions });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/dashboard", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const settings = await prisma.stockSettings.findUnique({ where: { labId } });
  const lowStockThreshold = settings?.lowStockThreshold ?? 5;
  const nearExpiryDays = settings?.nearExpiryDays ?? 90;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearExpiryDate = new Date(today);
  nearExpiryDate.setDate(nearExpiryDate.getDate() + nearExpiryDays);

  const [items, locations] = await Promise.all([
    prisma.stockItem.findMany({
      where: { labId, isArchived: false },
      include: { category: true, location: true },
    }),
    prisma.location.findMany({ where: { labId } }),
  ]);

  let totalStockValuePaise = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let expiredValuePaise = 0;
  let hazardousCount = 0;

  const categoryMap: Record<string, { name: string; count: number; valuePaise: number }> = {};
  const storageMap: Record<string, number> = {
    AMBIENT: 0, FRIDGE_2_8: 0, FREEZER_MINUS_20: 0, DEEP_FREEZER_MINUS_80: 0,
  };
  const expiryBuckets = { expired: 0, days0to30: 0, days31to90: 0, days90plus: 0 };

  for (const item of items) {
    const itemValue = item.pricePaise * item.currentQty;
    totalStockValuePaise += itemValue;

    const status = computeStockStatus(item.currentQty, item.expiryDate, lowStockThreshold, nearExpiryDays);
    if (status === "LOW_STOCK") lowStockCount++;
    if (status === "OUT_OF_STOCK") outOfStockCount++;
    if (status === "EXPIRED") { expiredCount++; expiredValuePaise += itemValue; }
    if (status === "EXPIRING_SOON") expiringSoonCount++;
    if (item.hazardStatus === "HAZARDOUS") hazardousCount++;

    storageMap[item.storageTemperature] = (storageMap[item.storageTemperature] ?? 0) + 1;

    const catName = item.category?.name ?? "Uncategorised";
    if (!categoryMap[catName]) categoryMap[catName] = { name: catName, count: 0, valuePaise: 0 };
    categoryMap[catName].count++;
    categoryMap[catName].valuePaise += itemValue;

    if (item.expiryDate) {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) expiryBuckets.expired++;
      else if (daysLeft <= 30) expiryBuckets.days0to30++;
      else if (daysLeft <= 90) expiryBuckets.days31to90++;
      else expiryBuckets.days90plus++;
    }
  }

  const nearExpiryItems = items
    .filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      return expiry >= today && expiry <= nearExpiryDate;
    })
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id, name: item.name, expiryDate: item.expiryDate,
      currentQty: item.currentQty,
      stockValuePaise: item.pricePaise * item.currentQty,
      location: item.location?.name ?? null,
    }));

  const lowStockItems = items
    .filter((item) => item.currentQty > 0 && item.currentQty <= lowStockThreshold)
    .sort((a, b) => a.currentQty - b.currentQty)
    .slice(0, 10)
    .map((item) => ({ id: item.id, name: item.name, currentQty: item.currentQty, lowStockThreshold }));

  return c.json({
    kpis: {
      totalItems: items.length, totalStockValuePaise,
      totalLocations: locations.length,
      lowStockCount, outOfStockCount, expiredCount, expiringSoonCount,
      expiredValuePaise, hazardousCount, nonHazardousCount: items.length - hazardousCount,
    },
    charts: {
      byCategory: Object.values(categoryMap),
      byStorage: Object.entries(storageMap).map(([storage, count]) => ({ storage, count })),
      expiryOverview: expiryBuckets,
    },
    nearExpiryItems,
    lowStockItems,
    settings: { lowStockThreshold, nearExpiryDays },
  });
});

// ─── Stock Items ───────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/items", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const settings = await prisma.stockSettings.findUnique({ where: { labId } });
  const lowStockThreshold = settings?.lowStockThreshold ?? 5;
  const nearExpiryDays = settings?.nearExpiryDays ?? 90;

  const search = c.req.query("search") ?? "";
  const categoryId = c.req.query("categoryId") ?? "";
  const hazard = c.req.query("hazard") ?? "";
  const storage = c.req.query("storage") ?? "";
  const locationId = c.req.query("locationId") ?? "";
  const tagId = c.req.query("tagId") ?? "";
  const expiryStatus = c.req.query("expiryStatus") ?? "";
  const availability = c.req.query("availability") ?? "";
  const includeArchived = c.req.query("archived") === "true";
  const sortBy = c.req.query("sortBy") ?? "updatedAt";
  const sortDir = (c.req.query("sortDir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")));

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { labId };
  if (!includeArchived) where.isArchived = false;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { casNo: { contains: search, mode: "insensitive" } },
      { catalogueNo: { contains: search, mode: "insensitive" } },
      { make: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;
  if (hazard) where.hazardStatus = hazard;
  if (storage) where.storageTemperature = storage;
  if (locationId) where.locationId = locationId;
  if (tagId) where.tags = { some: { tagId } };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearExpiryDate = new Date(today);
  nearExpiryDate.setDate(nearExpiryDate.getDate() + nearExpiryDays);

  if (expiryStatus === "EXPIRED") {
    where.expiryDate = { lt: today };
  } else if (expiryStatus === "EXPIRING_SOON") {
    where.expiryDate = { gte: today, lte: nearExpiryDate };
  } else if (expiryStatus === "VALID") {
    where.AND = [
      { OR: [{ expiryDate: null }, { expiryDate: { gt: nearExpiryDate } }] },
    ];
  }

  if (availability === "IN_STOCK") { where.currentQty = { gt: lowStockThreshold }; }
  else if (availability === "LOW_STOCK") { where.currentQty = { gt: 0, lte: lowStockThreshold }; }
  else if (availability === "OUT_OF_STOCK") { where.currentQty = 0; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any = {};
  if (sortBy === "name") orderBy.name = sortDir;
  else if (sortBy === "currentQty") orderBy.currentQty = sortDir;
  else if (sortBy === "pricePaise") orderBy.pricePaise = sortDir;
  else if (sortBy === "expiryDate") orderBy.expiryDate = sortDir;
  else orderBy.updatedAt = sortDir;

  const [total, items] = await Promise.all([
    prisma.stockItem.count({ where }),
    prisma.stockItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const enriched = items.map((item) => ({
    ...item,
    stockValuePaise: item.pricePaise * item.currentQty,
    status: computeStockStatus(item.currentQty, item.expiryDate, lowStockThreshold, nearExpiryDays),
  }));

  return c.json({ items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) });
});

stockRoutes.post("/lab/:labId/items", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canAddStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!dbUser) throw new HTTPException(401, { message: "User not found" });

  const body = await c.req.json();
  const {
    name, casNo, make, catalogueNo, packSize, pricePaise, initialQty, expiryDate,
    categoryId, hazardStatus, storageTemperature, locationId, remarks, tagIds,
  } = body;

  if (!name?.trim()) throw new HTTPException(400, { message: "Item name is required" });
  if (typeof pricePaise !== "number" || pricePaise < 0) throw new HTTPException(400, { message: "Invalid price" });
  const qty = typeof initialQty === "number" ? initialQty : 0;

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.create({
      data: {
        labId,
        name: name.trim(),
        casNo: casNo?.trim() || null,
        make: make?.trim() || null,
        catalogueNo: catalogueNo?.trim() || null,
        packSize: packSize?.trim() || null,
        pricePaise,
        currentQty: qty,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        categoryId: categoryId || null,
        hazardStatus: hazardStatus || "NON_HAZARDOUS",
        storageTemperature: storageTemperature || "AMBIENT",
        locationId: locationId || null,
        remarks: remarks?.trim() || null,
        createdById: userId,
        tags: tagIds?.length ? { create: (tagIds as string[]).map((tagId) => ({ tagId })) } : undefined,
      },
    });

    await tx.stockTransaction.create({
      data: {
        labId, type: "ADD", createdById: userId,
        remarks: `Initial stock: ${qty} unit(s)`,
        items: { create: { itemId: item.id, quantity: qty, previousQty: 0, newQty: qty } },
      },
    });

    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser.name ?? "Unknown",
        action: "ADD", itemId: item.id, itemName: item.name,
        quantityDelta: qty, previousQty: 0, newQty: qty,
        remarks: `Added ${qty} unit(s) as initial stock`,
      },
    });

    return item;
  });

  return c.json(result, 201);
});

stockRoutes.get("/lab/:labId/items/:itemId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, itemId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const settings = await prisma.stockSettings.findUnique({ where: { labId } });
  const lowStockThreshold = settings?.lowStockThreshold ?? 5;
  const nearExpiryDays = settings?.nearExpiryDays ?? 90;

  const item = await prisma.stockItem.findFirst({
    where: { id: itemId, labId },
    include: {
      category: true,
      location: { include: { parent: { include: { parent: true } } } },
      tags: { include: { tag: true } },
      transactionItems: {
        include: {
          transaction: { include: { createdBy: { select: { id: true, name: true } } } },
        },
        orderBy: { transaction: { createdAt: "desc" } },
        take: 50,
      },
    },
  });

  if (!item) throw new HTTPException(404, { message: "Item not found" });

  return c.json({
    ...item,
    stockValuePaise: item.pricePaise * item.currentQty,
    status: computeStockStatus(item.currentQty, item.expiryDate, lowStockThreshold, nearExpiryDays),
  });
});

stockRoutes.patch("/lab/:labId/items/:itemId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, itemId } = c.req.param();

  await requireStockPermission(labId, userId, "canEditStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const item = await prisma.stockItem.findFirst({ where: { id: itemId, labId } });
  if (!item) throw new HTTPException(404, { message: "Item not found" });

  const body = await c.req.json();
  const {
    name, casNo, make, catalogueNo, packSize, pricePaise, expiryDate,
    categoryId, hazardStatus, storageTemperature, locationId, remarks, tagIds,
  } = body;

  const locationChanged = locationId !== undefined && locationId !== item.locationId;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.stockItem.update({
      where: { id: itemId },
      data: {
        name: name?.trim() ?? item.name,
        casNo: casNo !== undefined ? casNo?.trim() || null : item.casNo,
        make: make !== undefined ? make?.trim() || null : item.make,
        catalogueNo: catalogueNo !== undefined ? catalogueNo?.trim() || null : item.catalogueNo,
        packSize: packSize !== undefined ? packSize?.trim() || null : item.packSize,
        pricePaise: pricePaise !== undefined ? pricePaise : item.pricePaise,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : item.expiryDate,
        categoryId: categoryId !== undefined ? categoryId || null : item.categoryId,
        hazardStatus: hazardStatus ?? item.hazardStatus,
        storageTemperature: storageTemperature ?? item.storageTemperature,
        locationId: locationId !== undefined ? locationId || null : item.locationId,
        remarks: remarks !== undefined ? remarks?.trim() || null : item.remarks,
        ...(tagIds !== undefined ? {
          tags: { deleteMany: {}, create: (tagIds as string[]).map((tagId) => ({ tagId })) },
        } : {}),
      },
    });

    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser?.name ?? "Unknown",
        action: locationChanged ? "LOCATION_CHANGE" : "EDIT",
        itemId, itemName: item.name,
        quantityDelta: 0, previousQty: item.currentQty, newQty: item.currentQty,
        remarks: locationChanged ? "Location updated" : "Item details updated",
      },
    });

    return updatedItem;
  });

  return c.json(updated);
});

stockRoutes.patch("/lab/:labId/items/:itemId/archive", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, itemId } = c.req.param();

  await requireStockPermission(labId, userId, "canEditStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const item = await prisma.stockItem.findFirst({ where: { id: itemId, labId } });
  if (!item) throw new HTTPException(404, { message: "Item not found" });

  const body = await c.req.json().catch(() => ({})) as { archive?: boolean };
  const archive = body.archive !== false;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.stockItem.update({ where: { id: itemId }, data: { isArchived: archive } });
    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser?.name ?? "Unknown",
        action: "EDIT", itemId, itemName: item.name,
        quantityDelta: 0, previousQty: item.currentQty, newQty: item.currentQty,
        remarks: archive ? "Item archived" : "Item restored from archive",
      },
    });
    return updatedItem;
  });

  return c.json(updated);
});

// ─── Transactions ──────────────────────────────────────────────────────────────

stockRoutes.post("/lab/:labId/transactions/issue", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canIssueStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!dbUser) throw new HTTPException(401, { message: "User not found" });

  const body = await c.req.json();
  const { items, purpose, projectName, remarks } = body as {
    items: Array<{ itemId: string; quantity: number }>;
    purpose?: string; projectName?: string; remarks?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    throw new HTTPException(400, { message: "At least one item is required" });
  }

  const stockItems = await prisma.stockItem.findMany({
    where: { id: { in: items.map((i) => i.itemId) }, labId, isArchived: false },
  });

  const stockMap = new Map(stockItems.map((s) => [s.id, s]));
  const validationErrors: string[] = [];

  for (const reqItem of items) {
    const stock = stockMap.get(reqItem.itemId);
    if (!stock) { validationErrors.push(`Item ${reqItem.itemId} not found`); continue; }
    if (typeof reqItem.quantity !== "number" || reqItem.quantity <= 0) {
      validationErrors.push(`Invalid quantity for ${stock.name}`); continue;
    }
    if (stock.currentQty < reqItem.quantity) {
      validationErrors.push(
        `Insufficient stock for "${stock.name}": requested ${reqItem.quantity}, available ${stock.currentQty}`
      );
    }
  }

  if (validationErrors.length > 0) {
    return c.json({ error: "Validation failed", details: validationErrors }, 422);
  }

  const result = await prisma.$transaction(async (tx) => {
    const txn = await tx.stockTransaction.create({
      data: {
        labId, type: "ISSUE", createdById: userId,
        purpose: purpose?.trim() || null,
        projectName: projectName?.trim() || null,
        remarks: remarks?.trim() || null,
      },
    });

    for (const reqItem of items) {
      const stock = stockMap.get(reqItem.itemId)!;
      const previousQty = stock.currentQty;
      const newQty = previousQty - reqItem.quantity;

      await tx.stockItem.update({ where: { id: stock.id }, data: { currentQty: newQty } });
      await tx.stockTransactionItem.create({
        data: { transactionId: txn.id, itemId: stock.id, quantity: reqItem.quantity, previousQty, newQty },
      });
      await tx.stockActivityLog.create({
        data: {
          labId, userId, userName: dbUser.name ?? "Unknown",
          action: "ISSUE", itemId: stock.id, itemName: stock.name,
          quantityDelta: -reqItem.quantity, previousQty, newQty,
          purpose: purpose?.trim() || null, remarks: remarks?.trim() || null,
        },
      });
    }

    return txn;
  });

  return c.json({ transaction: result }, 201);
});

stockRoutes.post("/lab/:labId/transactions/restock", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canRestockStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const body = await c.req.json();
  const { itemId, quantity, remarks, newExpiryDate, purchasePricePaise, supplier, invoiceNo } = body;

  if (!itemId) throw new HTTPException(400, { message: "itemId is required" });
  if (typeof quantity !== "number" || quantity <= 0) throw new HTTPException(400, { message: "Invalid quantity" });

  const stock = await prisma.stockItem.findFirst({ where: { id: itemId, labId, isArchived: false } });
  if (!stock) throw new HTTPException(404, { message: "Item not found" });

  const previousQty = stock.currentQty;
  const newQty = previousQty + quantity;

  const result = await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { currentQty: newQty };
    if (newExpiryDate) updateData.expiryDate = new Date(newExpiryDate);
    if (purchasePricePaise !== undefined) updateData.pricePaise = purchasePricePaise;

    const updatedItem = await tx.stockItem.update({ where: { id: itemId }, data: updateData });

    const txnRemarks = [
      remarks, supplier ? `Supplier: ${supplier}` : null, invoiceNo ? `Invoice: ${invoiceNo}` : null,
    ].filter(Boolean).join("; ") || null;

    const txn = await tx.stockTransaction.create({
      data: {
        labId, type: "RESTOCK", createdById: userId, remarks: txnRemarks,
        items: { create: { itemId, quantity, previousQty, newQty } },
      },
    });

    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser?.name ?? "Unknown",
        action: "RESTOCK", itemId, itemName: stock.name,
        quantityDelta: quantity, previousQty, newQty,
        remarks: remarks?.trim() || null,
      },
    });

    return { item: updatedItem, transaction: txn };
  });

  return c.json(result, 201);
});

stockRoutes.post("/lab/:labId/transactions/stockout", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canRestockStock");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const body = await c.req.json();
  const { itemId, quantity, reason, remarks } = body;

  if (!itemId) throw new HTTPException(400, { message: "itemId is required" });
  if (typeof quantity !== "number" || quantity <= 0) throw new HTTPException(400, { message: "Invalid quantity" });
  if (!reason?.trim()) throw new HTTPException(400, { message: "Reason is required for stockout" });

  const stock = await prisma.stockItem.findFirst({ where: { id: itemId, labId, isArchived: false } });
  if (!stock) throw new HTTPException(404, { message: "Item not found" });
  if (stock.currentQty < quantity) {
    throw new HTTPException(422, { message: `Insufficient stock: available ${stock.currentQty}` });
  }

  const previousQty = stock.currentQty;
  const newQty = previousQty - quantity;

  const result = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.stockItem.update({ where: { id: itemId }, data: { currentQty: newQty } });
    const txn = await tx.stockTransaction.create({
      data: {
        labId, type: "STOCKOUT", createdById: userId,
        reason: reason.trim(), remarks: remarks?.trim() || null,
        items: { create: { itemId, quantity, previousQty, newQty } },
      },
    });
    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser?.name ?? "Unknown",
        action: "STOCKOUT", itemId, itemName: stock.name,
        quantityDelta: -quantity, previousQty, newQty,
        reason: reason.trim(), remarks: remarks?.trim() || null,
      },
    });
    return { item: updatedItem, transaction: txn };
  });

  return c.json(result, 201);
});

stockRoutes.post("/lab/:labId/transactions/adjustment", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const body = await c.req.json();
  const { itemId, newQty, reason, remarks } = body;

  if (!itemId) throw new HTTPException(400, { message: "itemId is required" });
  if (typeof newQty !== "number" || newQty < 0) throw new HTTPException(400, { message: "Invalid new quantity" });
  if (!reason?.trim()) throw new HTTPException(400, { message: "Reason is required for adjustment" });

  const stock = await prisma.stockItem.findFirst({ where: { id: itemId, labId } });
  if (!stock) throw new HTTPException(404, { message: "Item not found" });

  const previousQty = stock.currentQty;
  const delta = newQty - previousQty;

  const result = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.stockItem.update({ where: { id: itemId }, data: { currentQty: newQty } });
    const txn = await tx.stockTransaction.create({
      data: {
        labId, type: "ADJUSTMENT", createdById: userId,
        reason: reason.trim(), remarks: remarks?.trim() || null,
        items: { create: { itemId, quantity: Math.abs(delta), previousQty, newQty } },
      },
    });
    await tx.stockActivityLog.create({
      data: {
        labId, userId, userName: dbUser?.name ?? "Unknown",
        action: "ADJUSTMENT", itemId, itemName: stock.name,
        quantityDelta: delta, previousQty, newQty,
        reason: reason.trim(), remarks: remarks?.trim() || null,
      },
    });
    return { item: updatedItem, transaction: txn };
  });

  return c.json(result, 201);
});

// ─── Activity Log ─────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/activity", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const action = c.req.query("action") ?? "";
  const itemId = c.req.query("itemId") ?? "";
  const actorId = c.req.query("userId") ?? "";
  const dateFrom = c.req.query("dateFrom") ?? "";
  const dateTo = c.req.query("dateTo") ?? "";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { labId };
  if (action) where.action = action;
  if (itemId) where.itemId = itemId;
  if (actorId) where.userId = actorId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [total, logs] = await Promise.all([
    prisma.stockActivityLog.count({ where }),
    prisma.stockActivityLog.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
  ]);

  return c.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/settings", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const settings = await prisma.stockSettings.findUnique({ where: { labId } });
  return c.json(settings ?? { labId, lowStockThreshold: 5, nearExpiryDays: 90 });
});

stockRoutes.patch("/lab/:labId/settings", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const { lowStockThreshold, nearExpiryDays } = body;

  const settings = await prisma.stockSettings.upsert({
    where: { labId },
    create: { labId, lowStockThreshold: lowStockThreshold ?? 5, nearExpiryDays: nearExpiryDays ?? 90 },
    update: {
      ...(lowStockThreshold !== undefined && { lowStockThreshold }),
      ...(nearExpiryDays !== undefined && { nearExpiryDays }),
    },
  });

  return c.json(settings);
});

// ─── Locations ────────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/locations", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const locations = await prisma.location.findMany({
    where: { labId, parentId: null },
    include: { children: { include: { children: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return c.json({ locations });
});

stockRoutes.get("/lab/:labId/locations/flat", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const locations = await prisma.location.findMany({
    where: { labId },
    include: { parent: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return c.json({ locations });
});

stockRoutes.post("/lab/:labId/locations", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const { name, parentId, sortOrder } = body;

  if (!name?.trim()) throw new HTTPException(400, { message: "Location name is required" });

  const location = await prisma.location.create({
    data: { labId, name: name.trim(), parentId: parentId || null, sortOrder: sortOrder ?? 0 },
  });

  return c.json(location, 201);
});

stockRoutes.patch("/lab/:labId/locations/:locationId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, locationId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const existing = await prisma.location.findFirst({ where: { id: locationId, labId } });
  if (!existing) throw new HTTPException(404, { message: "Location not found" });

  const updated = await prisma.location.update({
    where: { id: locationId },
    data: {
      name: body.name?.trim() ?? existing.name,
      parentId: body.parentId !== undefined ? body.parentId || null : existing.parentId,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  });

  return c.json(updated);
});

stockRoutes.delete("/lab/:labId/locations/:locationId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, locationId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const inUse = await prisma.stockItem.count({ where: { locationId, labId } });
  if (inUse > 0) {
    throw new HTTPException(409, { message: `Cannot delete: ${inUse} item(s) reference this location` });
  }

  await prisma.location.delete({ where: { id: locationId } });
  return c.json({ success: true });
});

// ─── Categories ───────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/categories", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const categories = await prisma.stockCategory.findMany({
    where: { labId }, orderBy: { sortOrder: "asc" },
  });

  return c.json({ categories });
});

stockRoutes.post("/lab/:labId/categories", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const { name, sortOrder } = body;
  if (!name?.trim()) throw new HTTPException(400, { message: "Category name is required" });

  const category = await prisma.stockCategory.create({
    data: { labId, name: name.trim(), sortOrder: sortOrder ?? 0 },
  });

  return c.json(category, 201);
});

stockRoutes.patch("/lab/:labId/categories/:categoryId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, categoryId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const existing = await prisma.stockCategory.findFirst({ where: { id: categoryId, labId } });
  if (!existing) throw new HTTPException(404, { message: "Category not found" });

  const updated = await prisma.stockCategory.update({
    where: { id: categoryId },
    data: { name: body.name?.trim() ?? existing.name, sortOrder: body.sortOrder ?? existing.sortOrder },
  });

  return c.json(updated);
});

stockRoutes.delete("/lab/:labId/categories/:categoryId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, categoryId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const inUse = await prisma.stockItem.count({ where: { categoryId, labId } });
  if (inUse > 0) {
    throw new HTTPException(409, { message: `Cannot delete: ${inUse} item(s) use this category` });
  }

  await prisma.stockCategory.delete({ where: { id: categoryId } });
  return c.json({ success: true });
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/tags", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canViewStock");

  const tags = await prisma.stockTag.findMany({ where: { labId }, orderBy: { sortOrder: "asc" } });
  return c.json({ tags });
});

stockRoutes.post("/lab/:labId/tags", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  if (!body.name?.trim()) throw new HTTPException(400, { message: "Tag name is required" });

  const tag = await prisma.stockTag.create({
    data: { labId, name: body.name.trim(), sortOrder: body.sortOrder ?? 0 },
  });

  return c.json(tag, 201);
});

stockRoutes.patch("/lab/:labId/tags/:tagId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, tagId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const body = await c.req.json();
  const existing = await prisma.stockTag.findFirst({ where: { id: tagId, labId } });
  if (!existing) throw new HTTPException(404, { message: "Tag not found" });

  const updated = await prisma.stockTag.update({
    where: { id: tagId },
    data: { name: body.name?.trim() ?? existing.name, sortOrder: body.sortOrder ?? existing.sortOrder },
  });

  return c.json(updated);
});

stockRoutes.delete("/lab/:labId/tags/:tagId", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, tagId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  await prisma.stockItemTag.deleteMany({ where: { tagId } });
  await prisma.stockTag.delete({ where: { id: tagId } });

  return c.json({ success: true });
});

// ─── Member Permissions ───────────────────────────────────────────────────────

stockRoutes.get("/lab/:labId/members", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const members = await prisma.labMember.findMany({
    where: { labId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ members });
});

stockRoutes.patch("/lab/:labId/members/:memberId/stock-permissions", async (c) => {
  const authUser = c.get("user");
  const userId = authUser.sub;
  const { labId, memberId } = c.req.param();

  await requireStockPermission(labId, userId, "canManageStockSettings");

  const workspace = await prisma.labWorkspace.findUnique({ where: { id: labId }, select: { ownerId: true } });
  const requester = await prisma.labMember.findUnique({ where: { labId_userId: { labId, userId } } });

  if (workspace?.ownerId !== userId && requester?.role !== "OWNER" && requester?.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only OWNER or ADMIN can modify permissions" });
  }

  const member = await prisma.labMember.findFirst({ where: { id: memberId, labId } });
  if (!member) throw new HTTPException(404, { message: "Member not found" });

  const body = await c.req.json();
  const {
    canViewStock, canAddStock, canEditStock, canIssueStock, canRestockStock, canManageStockSettings,
  } = body;

  const updated = await prisma.labMember.update({
    where: { id: memberId },
    data: {
      ...(canViewStock !== undefined && { canViewStock }),
      ...(canAddStock !== undefined && { canAddStock }),
      ...(canEditStock !== undefined && { canEditStock }),
      ...(canIssueStock !== undefined && { canIssueStock }),
      ...(canRestockStock !== undefined && { canRestockStock }),
      ...(canManageStockSettings !== undefined && { canManageStockSettings }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return c.json(updated);
});
