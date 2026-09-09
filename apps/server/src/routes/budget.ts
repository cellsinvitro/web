import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const budgetRoutes = new Hono<{ Variables: AuthVariables }>();

budgetRoutes.use("*", requireAuth);

// ── helpers ───────────────────────────────────────────────────────────────────

async function budgetSummary(budgetId: string, allocatedAmount: number) {
  const agg = await prisma.budgetSubmission.aggregate({
    where: { budgetId },
    _sum: { netEffect: true },
    _count: { id: true },
  });
  const netSpent = agg._sum.netEffect ?? 0;
  return { submissionCount: agg._count.id, netSpent, remaining: allocatedAmount - netSpent };
}

function serializeBudget(b: {
  id: string; ownerId: string; name: string; description: string | null;
  startDate: Date | null; endDate: Date | null; allocatedAmount: number;
  currency: string; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: b.id, ownerId: b.ownerId, name: b.name, description: b.description,
    startDate: b.startDate?.toISOString() ?? null,
    endDate: b.endDate?.toISOString() ?? null,
    allocatedAmount: b.allocatedAmount, currency: b.currency,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

/** Ensure budget exists and belongs to requesting user. */
async function requireOwnBudget(budgetId: string, userId: string) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget) throw new HTTPException(404, { message: "Budget not found" });
  if (budget.ownerId !== userId) throw new HTTPException(403, { message: "Forbidden" });
  return budget;
}

// ── GET /budgets  — list own budgets ─────────────────────────────────────────
budgetRoutes.get("/", async (c) => {
  const userId = c.get("user").sub;
  const budgets = await prisma.budget.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
  const withSummary = await Promise.all(
    budgets.map(async (b) => ({ ...serializeBudget(b), fields: b.fields, ...await budgetSummary(b.id, b.allocatedAmount) }))
  );
  return c.json({ budgets: withSummary });
});

// ── POST /budgets  — create a budget ─────────────────────────────────────────
budgetRoutes.post("/", async (c) => {
  const userId = c.get("user").sub;
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string; description?: string; startDate?: string; endDate?: string;
    allocatedAmount?: unknown; currency?: string;
  };

  const name = body.name?.trim();
  if (!name) throw new HTTPException(400, { message: "name is required" });

  const rawAmount = Number(body.allocatedAmount);
  if (!Number.isFinite(rawAmount) || rawAmount < 0)
    throw new HTTPException(400, { message: "allocatedAmount must be a non-negative number" });

  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;
  if (startDate && isNaN(startDate.getTime())) throw new HTTPException(400, { message: "Invalid startDate" });
  if (endDate && isNaN(endDate.getTime())) throw new HTTPException(400, { message: "Invalid endDate" });

  const budget = await prisma.budget.create({
    data: {
      ownerId: userId, name,
      description: body.description?.trim() || null,
      startDate, endDate,
      allocatedAmount: Math.round(rawAmount * 100),
      currency: body.currency?.trim().toUpperCase() || "INR",
    },
  });

  return c.json({ budget: { ...serializeBudget(budget), fields: [], submissionCount: 0, netSpent: 0, remaining: budget.allocatedAmount } }, 201);
});

// ── GET /budgets/:id  — budget detail + fields + submissions ──────────────────
budgetRoutes.get("/:id", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  const budget = await requireOwnBudget(budgetId, userId);

  const [fields, submissions] = await Promise.all([
    prisma.budgetFormField.findMany({ where: { budgetId }, orderBy: { sortOrder: "asc" } }),
    prisma.budgetSubmission.findMany({
      where: { budgetId },
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        values: {
          include: { field: { select: { id: true, label: true, fieldType: true, direction: true } } },
        },
      },
    }),
  ]);

  const summary = await budgetSummary(budgetId, budget.allocatedAmount);

  return c.json({
    budget: { ...serializeBudget(budget), fields, ...summary },
    submissions: submissions.map((s) => ({
      id: s.id,
      submittedAt: s.submittedAt.toISOString(),
      netEffect: s.netEffect,
      note: s.note,
      user: s.user,
      values: s.values.map((v) => ({
        fieldId: v.fieldId, label: v.field.label,
        fieldType: v.field.fieldType, direction: v.field.direction, value: v.value,
      })),
    })),
  });
});

// ── PATCH /budgets/:id  — update own budget ───────────────────────────────────
budgetRoutes.patch("/:id", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  await requireOwnBudget(budgetId, userId);

  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string; description?: string; startDate?: string | null;
    endDate?: string | null; allocatedAmount?: unknown; currency?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) throw new HTTPException(400, { message: "name cannot be empty" });
    data.name = n;
  }
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.allocatedAmount !== undefined) {
    const a = Number(body.allocatedAmount);
    if (!Number.isFinite(a) || a < 0) throw new HTTPException(400, { message: "allocatedAmount must be non-negative" });
    data.allocatedAmount = Math.round(a * 100);
  }
  if (body.currency !== undefined) data.currency = body.currency.trim().toUpperCase() || "INR";
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate) : null;

  const updated = await prisma.budget.update({ where: { id: budgetId }, data });
  const summary = await budgetSummary(budgetId, updated.allocatedAmount);
  const fields = await prisma.budgetFormField.findMany({ where: { budgetId }, orderBy: { sortOrder: "asc" } });

  return c.json({ budget: { ...serializeBudget(updated), fields, ...summary } });
});

// ── DELETE /budgets/:id  — delete own budget ──────────────────────────────────
budgetRoutes.delete("/:id", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  await requireOwnBudget(budgetId, userId);
  await prisma.budget.delete({ where: { id: budgetId } });
  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Per-budget field management (owner only)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /budgets/:id/fields ───────────────────────────────────────────────────
budgetRoutes.get("/:id/fields", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  await requireOwnBudget(budgetId, userId);
  const fields = await prisma.budgetFormField.findMany({ where: { budgetId }, orderBy: { sortOrder: "asc" } });
  return c.json({ fields });
});

// ── POST /budgets/:id/fields ──────────────────────────────────────────────────
budgetRoutes.post("/:id/fields", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  await requireOwnBudget(budgetId, userId);

  const body = (await c.req.json().catch(() => ({}))) as {
    label?: string; fieldType?: string; direction?: string;
    defaultValue?: string; sortOrder?: unknown;
  };

  const label = body.label?.trim();
  if (!label) throw new HTTPException(400, { message: "label is required" });

  const validTypes = ["TEXT", "NUMBER", "DATE"] as const;
  type FT = typeof validTypes[number];
  if (!validTypes.includes(body.fieldType as FT))
    throw new HTTPException(400, { message: "fieldType must be TEXT, NUMBER, or DATE" });
  const fieldType = body.fieldType as FT;

  const validDirs = ["EXPENSE", "ADDITION", "NONE"] as const;
  type Dir = typeof validDirs[number];
  const direction: Dir =
    fieldType === "NUMBER" && validDirs.includes(body.direction as Dir)
      ? (body.direction as Dir)
      : "NONE";

  const maxOrder = await prisma.budgetFormField.aggregate({ where: { budgetId }, _max: { sortOrder: true } });
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : (maxOrder._max.sortOrder ?? -1) + 1;

  const field = await prisma.budgetFormField.create({
    data: {
      budgetId, label, fieldType, direction,
      defaultValue: body.defaultValue?.trim() || null,
      sortOrder,
    },
  });

  return c.json({ field }, 201);
});

// ── PATCH /budgets/:id/fields/:fieldId ────────────────────────────────────────
budgetRoutes.patch("/:id/fields/:fieldId", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  const fieldId = c.req.param("fieldId");
  await requireOwnBudget(budgetId, userId);

  const existing = await prisma.budgetFormField.findFirst({ where: { id: fieldId, budgetId } });
  if (!existing) throw new HTTPException(404, { message: "Field not found" });

  const body = (await c.req.json().catch(() => ({}))) as {
    label?: string; fieldType?: string; direction?: string;
    defaultValue?: string; sortOrder?: unknown;
  };

  const validTypes = ["TEXT", "NUMBER", "DATE"] as const;
  type FT = typeof validTypes[number];
  const validDirs = ["EXPENSE", "ADDITION", "NONE"] as const;
  type Dir = typeof validDirs[number];

  const data: Record<string, unknown> = {};
  if (body.label !== undefined) {
    const l = body.label.trim();
    if (!l) throw new HTTPException(400, { message: "label cannot be empty" });
    data.label = l;
  }
  const newType: FT = validTypes.includes(body.fieldType as FT) ? (body.fieldType as FT) : existing.fieldType;
  if (body.fieldType !== undefined) data.fieldType = newType;
  if (body.direction !== undefined) {
    const dir: Dir = validDirs.includes(body.direction as Dir) ? (body.direction as Dir) : "NONE";
    data.direction = newType === "NUMBER" ? dir : "NONE";
  }
  if (body.defaultValue !== undefined) data.defaultValue = body.defaultValue.trim() || null;
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

  const field = await prisma.budgetFormField.update({ where: { id: fieldId }, data });
  return c.json({ field });
});

// ── DELETE /budgets/:id/fields/:fieldId ───────────────────────────────────────
budgetRoutes.delete("/:id/fields/:fieldId", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  const fieldId = c.req.param("fieldId");
  await requireOwnBudget(budgetId, userId);

  const existing = await prisma.budgetFormField.findFirst({ where: { id: fieldId, budgetId } });
  if (!existing) throw new HTTPException(404, { message: "Field not found" });

  await prisma.budgetFormField.delete({ where: { id: fieldId } });
  return c.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Submissions (owner only)
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /budgets/:id/submissions ─────────────────────────────────────────────
budgetRoutes.post("/:id/submissions", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  await requireOwnBudget(budgetId, userId);

  const fields = await prisma.budgetFormField.findMany({ where: { budgetId }, orderBy: { sortOrder: "asc" } });
  if (fields.length === 0)
    throw new HTTPException(400, { message: "Add at least one field to your budget form before submitting." });

  const body = (await c.req.json().catch(() => ({}))) as { values?: Record<string, string>; note?: string };
  const inputValues: Record<string, string> = body.values ?? {};
  const note = body.note?.trim() || null;

  let netEffect = 0;
  for (const field of fields) {
    if (field.fieldType !== "NUMBER" || field.direction === "NONE") continue;
    const raw = inputValues[field.id];
    if (!raw?.trim()) continue;
    const amount = Math.round(parseFloat(raw) * 100);
    if (!Number.isFinite(amount)) continue;
    if (field.direction === "EXPENSE") netEffect += amount;
    else if (field.direction === "ADDITION") netEffect -= amount;
  }

  const submission = await prisma.budgetSubmission.create({
    data: {
      budgetId, userId, netEffect, note,
      values: {
        create: fields
          .filter((f) => inputValues[f.id] !== undefined && inputValues[f.id] !== "")
          .map((f) => ({ fieldId: f.id, value: String(inputValues[f.id]).trim() })),
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      values: {
        include: { field: { select: { id: true, label: true, fieldType: true, direction: true } } },
      },
    },
  });

  return c.json({
    submission: {
      id: submission.id,
      submittedAt: submission.submittedAt.toISOString(),
      netEffect: submission.netEffect,
      note: submission.note,
      user: submission.user,
      values: submission.values.map((v) => ({
        fieldId: v.fieldId, label: v.field.label,
        fieldType: v.field.fieldType, direction: v.field.direction, value: v.value,
      })),
    },
  }, 201);
});

// ── DELETE /budgets/:id/submissions/:subId ────────────────────────────────────
budgetRoutes.delete("/:id/submissions/:subId", async (c) => {
  const userId = c.get("user").sub;
  const budgetId = c.req.param("id");
  const subId = c.req.param("subId");
  await requireOwnBudget(budgetId, userId);

  const sub = await prisma.budgetSubmission.findFirst({ where: { id: subId, budgetId } });
  if (!sub) throw new HTTPException(404, { message: "Submission not found" });

  await prisma.budgetSubmission.delete({ where: { id: subId } });
  return c.json({ success: true });
});
