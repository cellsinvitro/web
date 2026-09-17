import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

export const logbookRoutes = new Hono<{ Variables: AuthVariables }>();

// All logbook endpoints require authentication
logbookRoutes.use("*", requireAuth);

// Helper: Ensure default instruments exist
async function ensureDefaultInstruments() {
  const count = await prisma.instrument.count();
  if (count > 0) return;

  const defaultInstruments = [
    {
      code: "HPLC-01",
      name: "HPLC System",
      installedOn: new Date("2025-03-12"),
      lastServiceDate: new Date("2026-08-05"),
      lastCleaningDate: new Date("2026-09-10"),
      nextServiceDate: new Date("2026-10-20"),
      inchargeName: "Dr. XYZ",
      inchargeContact: "+91 9876543210",
      description: "High-Performance Liquid Chromatography system for analytical separations.",
      status: "ACTIVE" as const,
    },
    {
      code: "SPEC-01",
      name: "Spectrophotometer",
      installedOn: new Date("2025-01-15"),
      lastServiceDate: new Date("2026-07-10"),
      lastCleaningDate: new Date("2026-09-01"),
      nextServiceDate: new Date("2026-11-15"),
      inchargeName: "Dr. Rajesh Patel",
      inchargeContact: "+91 9876543211",
      description: "UV-Vis spectrophotometer for optical density measurements.",
      status: "ACTIVE" as const,
    },
    {
      code: "CENT-01",
      name: "Centrifuge",
      installedOn: new Date("2025-05-20"),
      lastServiceDate: new Date("2026-09-01"),
      lastCleaningDate: new Date("2026-09-15"),
      nextServiceDate: new Date("2026-12-01"),
      inchargeName: "Ananya Verma",
      inchargeContact: "+91 9876543212",
      description: "High-speed refrigerated benchtop centrifuge.",
      status: "ACTIVE" as const,
    },
  ];

  for (const inst of defaultInstruments) {
    await prisma.instrument.upsert({
      where: { code: inst.code },
      create: inst,
      update: {},
    });
  }
}

// Helper: Fetch user record + permissions
async function getUserWithRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new HTTPException(401, { message: "User not found" });
  return user;
}

async function getUserPermissions(userId: string) {
  const dbUser = await getUserWithRole(userId);

  if (dbUser.role === "ADMIN") {
    return {
      role: dbUser.role,
      user: dbUser,
      permissions: {
        canViewLogbook: true,
        canCreateEntries: true,
        canEditOwnEntries: true,
        canEditOthersEntries: true,
        canManageInstruments: true,
        canGenerateReports: true,
      },
    };
  }

  const perm = await prisma.logbookPermission.findUnique({
    where: { userId },
  });

  return {
    role: dbUser.role,
    user: dbUser,
    permissions: perm || {
      canViewLogbook: true,
      canCreateEntries: true,
      canEditOwnEntries: true,
      canEditOthersEntries: false,
      canManageInstruments: false,
      canGenerateReports: false,
    },
  };
}

// Helper: Format date string YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: Parse date string + time string into DateTime
function parseDateTime(dateStr: string, timeStr: string): Date {
  const parts = timeStr.split(":");
  const hours = Number(parts[0] || 0);
  const minutes = Number(parts[1] || 0);
  const d = new Date(dateStr);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Helper: Log action in LogbookActivity
async function logActivity(userId: string, userName: string, action: string, details: string, instrumentId?: string) {
  try {
    await prisma.logbookActivity.create({
      data: {
        userId,
        userName,
        action,
        details,
        instrumentId: instrumentId || null,
      },
    });
  } catch (err) {
    console.error("Failed to write logbook activity:", err);
  }
}

// ─────────────────────────────────────────────
// INSTRUMENTS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/instruments - List all instruments
logbookRoutes.get("/instruments", async (c) => {
  await ensureDefaultInstruments();

  const authUser = c.get("user");
  const { permissions } = await getUserPermissions(authUser.sub);

  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "Access denied to Logbook" });
  }

  const instruments = await prisma.instrument.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    include: {
      bookings: {
        where: {
          status: "CONFIRMED",
        },
        orderBy: { startDateTime: "asc" },
      },
    },
  });

  const todayStr = getTodayString();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enriched = instruments.map((inst) => {
    // Today's bookings
    const todayBookings = inst.bookings.filter((b) => {
      const bDateStr = b.date.toISOString().split("T")[0];
      return bDateStr === todayStr;
    });

    // Next upcoming booking today
    const nextBooking = todayBookings.find((b) => b.startDateTime >= now) || todayBookings[0] || null;

    // Service due status
    const isServiceDueSoon = inst.nextServiceDate ? inst.nextServiceDate <= thirtyDaysFromNow : false;

    return {
      id: inst.id,
      code: inst.code,
      name: inst.name,
      installedOn: inst.installedOn,
      lastServiceDate: inst.lastServiceDate,
      lastCleaningDate: inst.lastCleaningDate,
      nextServiceDate: inst.nextServiceDate,
      inchargeName: inst.inchargeName,
      inchargeContact: inst.inchargeContact,
      description: inst.description,
      status: inst.status,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
      todayBookingsCount: todayBookings.length,
      nextBookingTime: nextBooking ? `${nextBooking.startTime} (${nextBooking.userName})` : null,
      isServiceDueSoon,
    };
  });

  return c.json({ instruments: enriched, permissions });
});

// POST /logbook/instruments - Add instrument (Admin / Manage permission)
logbookRoutes.post("/instruments", async (c) => {
  const authUser = c.get("user");
  const { permissions, user: dbUser } = await getUserPermissions(authUser.sub);

  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can manage instruments" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || !body.code) {
    throw new HTTPException(400, { message: "Instrument Name and Code are required" });
  }

  const existing = await prisma.instrument.findUnique({ where: { code: String(body.code).trim() } });
  if (existing) {
    throw new HTTPException(409, { message: `Instrument code '${body.code}' already exists` });
  }

  const instrument = await prisma.instrument.create({
    data: {
      code: String(body.code).trim(),
      name: String(body.name).trim(),
      installedOn: body.installedOn ? new Date(body.installedOn) : null,
      lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : null,
      lastCleaningDate: body.lastCleaningDate ? new Date(body.lastCleaningDate) : null,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      inchargeName: body.inchargeName ? String(body.inchargeName).trim() : null,
      inchargeContact: body.inchargeContact ? String(body.inchargeContact).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      status: body.status || "ACTIVE",
    },
  });

  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_ADDED", `${instrument.name} (${instrument.code}) was added to Lab Logbook`, instrument.id);

  return c.json({ instrument }, 201);
});

// GET /logbook/instruments/:id - View single instrument details
logbookRoutes.get("/instruments/:id", async (c) => {
  const id = c.req.param("id");
  const instrument = await prisma.instrument.findUnique({
    where: { id },
    include: {
      bookings: {
        where: { status: "CONFIRMED" },
        orderBy: { startDateTime: "asc" },
      },
    },
  });

  if (!instrument) {
    throw new HTTPException(404, { message: "Instrument not found" });
  }

  return c.json({ instrument });
});

// PATCH /logbook/instruments/:id - Edit instrument
logbookRoutes.patch("/instruments/:id", async (c) => {
  const authUser = c.get("user");
  const { permissions, user: dbUser } = await getUserPermissions(authUser.sub);

  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can modify instrument information" });
  }

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Request body required" });

  const updated = await prisma.instrument.update({
    where: { id },
    data: {
      ...(body.name && { name: String(body.name).trim() }),
      ...(body.code && { code: String(body.code).trim() }),
      ...(body.installedOn !== undefined && { installedOn: body.installedOn ? new Date(body.installedOn) : null }),
      ...(body.lastServiceDate !== undefined && { lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : null }),
      ...(body.lastCleaningDate !== undefined && { lastCleaningDate: body.lastCleaningDate ? new Date(body.lastCleaningDate) : null }),
      ...(body.nextServiceDate !== undefined && { nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null }),
      ...(body.inchargeName !== undefined && { inchargeName: body.inchargeName ? String(body.inchargeName).trim() : null }),
      ...(body.inchargeContact !== undefined && { inchargeContact: body.inchargeContact ? String(body.inchargeContact).trim() : null }),
      ...(body.description !== undefined && { description: body.description ? String(body.description).trim() : null }),
      ...(body.status && { status: body.status }),
    },
  });

  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_UPDATED", `${updated.name} service/information was updated`, updated.id);

  return c.json({ instrument: updated });
});

// DELETE /logbook/instruments/:id - Archive instrument
logbookRoutes.delete("/instruments/:id", async (c) => {
  const authUser = c.get("user");
  const { permissions, user: dbUser } = await getUserPermissions(authUser.sub);

  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can archive instruments" });
  }

  const id = c.req.param("id");
  const updated = await prisma.instrument.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_ARCHIVED", `${updated.name} was archived`, updated.id);

  return c.json({ success: true, instrument: updated });
});

// ─────────────────────────────────────────────
// BOOKINGS / LOG ENTRIES ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/bookings - Fetch bookings for instrument & date / date range
logbookRoutes.get("/bookings", async (c) => {
  const instrumentId = c.req.query("instrumentId");
  const dateStr = c.req.query("date"); // YYYY-MM-DD
  const fromDateStr = c.req.query("fromDate");
  const toDateStr = c.req.query("toDate");

  const whereClause: Record<string, unknown> = {
    status: "CONFIRMED",
  };

  if (instrumentId) {
    whereClause.instrumentId = instrumentId;
  }

  if (dateStr) {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    whereClause.startDateTime = { gte: startOfDay, lte: endOfDay };
  } else if (fromDateStr && toDateStr) {
    const start = new Date(`${fromDateStr}T00:00:00.000Z`);
    const end = new Date(`${toDateStr}T23:59:59.999Z`);
    whereClause.startDateTime = { gte: start, lte: end };
  }

  const bookings = await prisma.instrumentBooking.findMany({
    where: whereClause,
    orderBy: { startDateTime: "asc" },
    include: {
      instrument: { select: { id: true, name: true, code: true, status: true } },
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return c.json({ bookings });
});

// POST /logbook/bookings - Create new booking with strict overlap check
logbookRoutes.post("/bookings", async (c) => {
  const authUser = c.get("user");
  const { permissions, user: dbUser } = await getUserPermissions(authUser.sub);

  if (!permissions.canCreateEntries) {
    throw new HTTPException(403, { message: "You do not have permission to create logbook entries" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.instrumentId || !body.date || !body.startTime || !body.endTime) {
    throw new HTTPException(400, { message: "Instrument, Date, Start Time, and End Time are required" });
  }

  const { instrumentId, date: dateStr, startTime, endTime, remarks } = body;

  // Verify instrument availability
  const instrument = await prisma.instrument.findUnique({ where: { id: String(instrumentId) } });
  if (!instrument) {
    throw new HTTPException(404, { message: "Instrument not found" });
  }
  if (instrument.status === "UNDER_MAINTENANCE" || instrument.status === "OUT_OF_SERVICE" || instrument.status === "ARCHIVED") {
    throw new HTTPException(400, { message: `Instrument is currently ${instrument.status.replace("_", " ").toLowerCase()}. New bookings are disabled.` });
  }

  // Parse start & end Date objects
  const startDateTime = parseDateTime(String(dateStr), String(startTime));
  const endDateTime = parseDateTime(String(dateStr), String(endTime));

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    throw new HTTPException(400, { message: "Invalid date or time format" });
  }

  if (endDateTime <= startDateTime) {
    throw new HTTPException(400, { message: "End time must be after start time" });
  }

  const displayName = dbUser.name || dbUser.email;

  // ─────────────────────────────────────────────
  // STRICT ATOMIC OVERLAP CHECK (BACKEND LEVEL)
  // Two ranges [A_start, A_end) and [B_start, B_end) overlap iff:
  // A_start < B_end AND A_end > B_start
  // ─────────────────────────────────────────────
  const overlappingBookings = await prisma.instrumentBooking.findMany({
    where: {
      instrumentId: String(instrumentId),
      status: "CONFIRMED",
      startDateTime: { lt: endDateTime },
      endDateTime: { gt: startDateTime },
    },
  });

  if (overlappingBookings.length > 0) {
    const conflict = overlappingBookings[0];
    if (conflict) {
      throw new HTTPException(409, {
        message: `Instrument already booked during this time (${conflict.startTime} - ${conflict.endTime} by ${conflict.userName})`,
      });
    }
  }

  // Create booking
  const booking = await prisma.instrumentBooking.create({
    data: {
      instrumentId: String(instrumentId),
      userId: authUser.sub,
      userName: displayName,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      startTime: String(startTime),
      endTime: String(endTime),
      startDateTime,
      endDateTime,
      remarks: remarks ? String(remarks).trim() : null,
      status: "CONFIRMED",
      createdBy: authUser.sub,
    },
    include: {
      instrument: { select: { id: true, name: true, code: true } },
    },
  });

  // Log activity
  await logActivity(
    authUser.sub,
    displayName,
    "BOOKING_CREATED",
    `${displayName} booked ${instrument.name} from ${startTime} to ${endTime} on ${dateStr}`,
    instrument.id
  );

  return c.json({ booking }, 201);
});

// PATCH /logbook/bookings/:id - Edit booking
logbookRoutes.patch("/bookings/:id", async (c) => {
  const authUser = c.get("user");
  const { permissions, role, user: dbUser } = await getUserPermissions(authUser.sub);
  const id = c.req.param("id");

  const existing = await prisma.instrumentBooking.findUnique({
    where: { id },
    include: { instrument: true },
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Booking not found" });
  }

  // Permission check: Admin or Owner
  const isOwner = existing.userId === authUser.sub;
  if (!isOwner && !permissions.canEditOthersEntries && role !== "ADMIN") {
    throw new HTTPException(403, { message: "You cannot modify another member's booking" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Request body required" });

  const dateStr = body.date || existing.date.toISOString().split("T")[0];
  const startTime = body.startTime || existing.startTime;
  const endTime = body.endTime || existing.endTime;

  const startDateTime = parseDateTime(String(dateStr), String(startTime));
  const endDateTime = parseDateTime(String(dateStr), String(endTime));

  if (endDateTime <= startDateTime) {
    throw new HTTPException(400, { message: "End time must be after start time" });
  }

  // If time/date changed, perform overlap check (excluding current booking ID)
  if (
    startDateTime.getTime() !== existing.startDateTime.getTime() ||
    endDateTime.getTime() !== existing.endDateTime.getTime()
  ) {
    const overlapping = await prisma.instrumentBooking.findMany({
      where: {
        id: { not: id },
        instrumentId: existing.instrumentId,
        status: "CONFIRMED",
        startDateTime: { lt: endDateTime },
        endDateTime: { gt: startDateTime },
      },
    });

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      if (conflict) {
        throw new HTTPException(409, {
          message: `Instrument already booked during this time (${conflict.startTime} - ${conflict.endTime} by ${conflict.userName})`,
        });
      }
    }
  }

  const updated = await prisma.instrumentBooking.update({
    where: { id },
    data: {
      date: new Date(`${dateStr}T00:00:00.000Z`),
      startTime: String(startTime),
      endTime: String(endTime),
      startDateTime,
      endDateTime,
      ...(body.remarks !== undefined && { remarks: body.remarks ? String(body.remarks).trim() : null }),
    },
    include: {
      instrument: { select: { id: true, name: true, code: true } },
    },
  });

  const displayName = dbUser.name || dbUser.email;

  const actionText = isOwner
    ? `${displayName} updated their ${existing.instrument.name} booking`
    : `${displayName} (Admin) modified ${existing.userName}'s ${existing.instrument.name} booking`;

  await logActivity(authUser.sub, displayName, "BOOKING_UPDATED", actionText, existing.instrumentId);

  return c.json({ booking: updated });
});

// DELETE /logbook/bookings/:id - Cancel booking
logbookRoutes.delete("/bookings/:id", async (c) => {
  const authUser = c.get("user");
  const { permissions, role, user: dbUser } = await getUserPermissions(authUser.sub);
  const id = c.req.param("id");

  const existing = await prisma.instrumentBooking.findUnique({
    where: { id },
    include: { instrument: true },
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Booking not found" });
  }

  // Permission check: Admin or Owner
  const isOwner = existing.userId === authUser.sub;
  if (!isOwner && !permissions.canEditOthersEntries && role !== "ADMIN") {
    throw new HTTPException(403, { message: "You cannot cancel another member's booking" });
  }

  const cancelled = await prisma.instrumentBooking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const displayName = dbUser.name || dbUser.email;

  const actionText = isOwner
    ? `${displayName} cancelled their ${existing.instrument.name} booking (${existing.startTime} - ${existing.endTime})`
    : `${displayName} (Admin) cancelled ${existing.userName}'s ${existing.instrument.name} booking`;

  await logActivity(authUser.sub, displayName, "BOOKING_CANCELLED", actionText, existing.instrumentId);

  return c.json({ success: true, booking: cancelled });
});

// ─────────────────────────────────────────────
// PERMISSIONS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/permissions - List team permissions (Admin view)
logbookRoutes.get("/permissions", async (c) => {
  const authUser = c.get("user");
  const { role } = await getUserPermissions(authUser.sub);
  if (role !== "ADMIN") {
    throw new HTTPException(403, { message: "Admin access required" });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      designation: true,
      logbookPermission: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const enrichedUsers = users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    designation: u.designation,
    permissions: u.logbookPermission || {
      canViewLogbook: true,
      canCreateEntries: true,
      canEditOwnEntries: true,
      canEditOthersEntries: u.role === "ADMIN",
      canManageInstruments: u.role === "ADMIN",
      canGenerateReports: u.role === "ADMIN",
    },
  }));

  return c.json({ users: enrichedUsers });
});

// PATCH /logbook/permissions/:userId - Update user logbook permissions
logbookRoutes.patch("/permissions/:userId", async (c) => {
  const authUser = c.get("user");
  const { role } = await getUserPermissions(authUser.sub);
  if (role !== "ADMIN") {
    throw new HTTPException(403, { message: "Admin access required" });
  }

  const userId = c.req.param("userId");
  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Request body required" });

  const updated = await prisma.logbookPermission.upsert({
    where: { userId },
    create: {
      userId,
      canViewLogbook: body.canViewLogbook ?? true,
      canCreateEntries: body.canCreateEntries ?? true,
      canEditOwnEntries: body.canEditOwnEntries ?? true,
      canEditOthersEntries: body.canEditOthersEntries ?? false,
      canManageInstruments: body.canManageInstruments ?? false,
      canGenerateReports: body.canGenerateReports ?? false,
    },
    update: {
      ...(body.canViewLogbook !== undefined && { canViewLogbook: Boolean(body.canViewLogbook) }),
      ...(body.canCreateEntries !== undefined && { canCreateEntries: Boolean(body.canCreateEntries) }),
      ...(body.canEditOwnEntries !== undefined && { canEditOwnEntries: Boolean(body.canEditOwnEntries) }),
      ...(body.canEditOthersEntries !== undefined && { canEditOthersEntries: Boolean(body.canEditOthersEntries) }),
      ...(body.canManageInstruments !== undefined && { canManageInstruments: Boolean(body.canManageInstruments) }),
      ...(body.canGenerateReports !== undefined && { canGenerateReports: Boolean(body.canGenerateReports) }),
    },
  });

  return c.json({ permission: updated });
});

// ─────────────────────────────────────────────
// ACTIVITIES ENDPOINT
// ─────────────────────────────────────────────

// GET /logbook/activities - Master Logbook Activity log
logbookRoutes.get("/activities", async (c) => {
  const instrumentId = c.req.query("instrumentId");

  const whereClause: Record<string, unknown> = {};
  if (instrumentId) whereClause.instrumentId = instrumentId;

  const activities = await prisma.logbookActivity.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return c.json({ activities });
});

// ─────────────────────────────────────────────
// REPORTS ENDPOINT
// ─────────────────────────────────────────────

// GET /logbook/reports - Generate reports rows
logbookRoutes.get("/reports", async (c) => {
  const authUser = c.get("user");
  const { permissions } = await getUserPermissions(authUser.sub);

  if (!permissions.canGenerateReports) {
    throw new HTTPException(403, { message: "Only authorized members can generate reports" });
  }

  const instrumentId = c.req.query("instrumentId");
  const fromDateStr = c.req.query("fromDate");
  const toDateStr = c.req.query("toDate");
  const userId = c.req.query("userId");

  const whereClause: Record<string, unknown> = {
    status: "CONFIRMED",
  };

  if (instrumentId && instrumentId !== "ALL") {
    whereClause.instrumentId = instrumentId;
  }

  if (userId && userId !== "ALL") {
    whereClause.userId = userId;
  }

  if (fromDateStr && toDateStr) {
    const start = new Date(`${fromDateStr}T00:00:00.000Z`);
    const end = new Date(`${toDateStr}T23:59:59.999Z`);
    whereClause.startDateTime = { gte: start, lte: end };
  }

  const bookings = await prisma.instrumentBooking.findMany({
    where: whereClause,
    orderBy: { startDateTime: "asc" },
    include: {
      instrument: { select: { name: true, code: true } },
    },
  });

  const reportRows = bookings.map((b) => {
    const durationMs = b.endDateTime.getTime() - b.startDateTime.getTime();
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
    const dateFormatted = b.date.toISOString().split("T")[0];

    return {
      id: b.id,
      date: dateFormatted,
      instrumentName: b.instrument.name,
      instrumentCode: b.instrument.code,
      user: b.userName,
      startTime: b.startTime,
      endTime: b.endTime,
      durationHours: `${durationHours} hrs`,
      remarks: b.remarks || "-",
    };
  });

  return c.json({ reportRows, totalBookings: reportRows.length });
});

// ─────────────────────────────────────────────
// LAB NOTEBOOK ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/notebook - Fetch entry for date
logbookRoutes.get("/notebook", async (c) => {
  const dateStr = c.req.query("date") || getTodayString();
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  const entry = await prisma.labNotebookEntry.findUnique({
    where: { date: dateObj },
  });

  return c.json({
    date: dateStr,
    entry: entry || null,
  });
});

// POST /logbook/notebook - Save today's notebook entry
logbookRoutes.post("/notebook", async (c) => {
  const authUser = c.get("user");
  const { user: dbUser } = await getUserPermissions(authUser.sub);

  const body = await c.req.json().catch(() => null);

  if (!body || body.content === undefined) {
    throw new HTTPException(400, { message: "Content required" });
  }

  const dateStr = body.date || getTodayString();
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  const displayName = dbUser.name || dbUser.email;

  const entry = await prisma.labNotebookEntry.upsert({
    where: { date: dateObj },
    create: {
      date: dateObj,
      userId: authUser.sub,
      userName: displayName,
      content: String(body.content),
    },
    update: {
      userId: authUser.sub,
      userName: displayName,
      content: String(body.content),
    },
  });

  return c.json({ entry });
});
