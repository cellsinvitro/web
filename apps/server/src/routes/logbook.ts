import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import crypto from "node:crypto";
import { sendLogbookInviteEmail } from "../lib/email.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3001";

export const logbookRoutes = new Hono<{ Variables: AuthVariables }>();

// All logbook endpoints require authentication
logbookRoutes.use("*", requireAuth);

// Helper: Fetch user record
async function getUserWithRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new HTTPException(401, { message: "User not found" });
  return user;
}

// Helper: Ensure user has at least one Lab Workspace (creates "My Lab Book" if none exists)
async function ensureUserLabWorkspace(userId: string) {
  const dbUser = await getUserWithRole(userId);
  const owned = await prisma.labWorkspace.findFirst({ where: { ownerId: userId } });
  if (owned) return owned;

  const joined = await prisma.labMember.findFirst({ where: { userId } });
  if (joined) {
    const lab = await prisma.labWorkspace.findUnique({ where: { id: joined.labId } });
    if (lab) return lab;
  }

  // Create default lab workspace for this user
  const newLab = await prisma.labWorkspace.create({
    data: {
      name: `${dbUser.name || "My"} Lab Book`,
      description: "Personal Laboratory Workspace & Instrument Logbook",
      ownerId: userId,
      members: {
        create: {
          userId: userId,
          role: "OWNER",
          canViewLogbook: true,
          canCreateEntries: true,
          canEditOwnEntries: true,
          canEditOthersEntries: true,
          canManageInstruments: true,
          canGenerateReports: true,
        },
      },
    },
  });

  // Also seed default instruments for new lab if none exist
  await seedDefaultInstrumentsForLab(newLab.id);

  return newLab;
}

// Seed default instruments for a specific lab workspace
async function seedDefaultInstrumentsForLab(labId: string) {
  const count = await prisma.instrument.count({ where: { labId } });
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
      labId,
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
      labId,
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
      labId,
    },
  ];

  for (const inst of defaultInstruments) {
    await prisma.instrument.create({ data: inst });
  }
}

// Helper: Resolve active lab workspace & permissions for a user
async function resolveLabAndPermissions(userId: string, requestedLabId?: string | null) {
  const dbUser = await getUserWithRole(userId);

  let labId = requestedLabId;
  if (!labId) {
    const activeLab = await ensureUserLabWorkspace(userId);
    labId = activeLab.id;
  }

  const lab = await prisma.labWorkspace.findUnique({
    where: { id: labId },
    include: { owner: true },
  });

  if (!lab) {
    throw new HTTPException(404, { message: "Lab workspace not found" });
  }

  // System admin or Lab Owner gets full privileges
  if (dbUser.role === "ADMIN" || lab.ownerId === userId) {
    return {
      lab,
      isOwner: true,
      role: dbUser.role === "ADMIN" ? "ADMIN" : "OWNER",
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

  // Check membership
  const member = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId } },
  });

  if (!member) {
    throw new HTTPException(403, { message: "You are not a member of this Lab Workspace" });
  }

  return {
    lab,
    isOwner: member.role === "OWNER",
    role: member.role,
    permissions: {
      canViewLogbook: member.canViewLogbook,
      canCreateEntries: member.canCreateEntries,
      canEditOwnEntries: member.canEditOwnEntries,
      canEditOthersEntries: member.canEditOthersEntries,
      canManageInstruments: member.canManageInstruments,
      canGenerateReports: member.canGenerateReports,
    },
  };
}

// Format date string YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Log action in LogbookActivity
async function logActivity(userId: string, userName: string, action: string, details: string, labId?: string, instrumentId?: string) {
  try {
    await prisma.logbookActivity.create({
      data: {
        userId,
        userName,
        action,
        details,
        labId: labId || null,
        instrumentId: instrumentId || null,
      },
    });
  } catch (err) {
    console.error("Failed to write logbook activity:", err);
  }
}

// ─────────────────────────────────────────────
// LAB WORKSPACE ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/labs - List labs owned or joined by user
logbookRoutes.get("/labs", async (c) => {
  const authUser = c.get("user");
  await ensureUserLabWorkspace(authUser.sub);

  const ownedLabs = await prisma.labWorkspace.findMany({
    where: { ownerId: authUser.sub },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberRecords = await prisma.labMember.findMany({
    where: { userId: authUser.sub },
    include: {
      lab: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
  });

  const ownedIds = new Set(ownedLabs.map((l) => l.id));
  const joinedLabs = memberRecords
    .map((mr) => mr.lab)
    .filter((l) => !ownedIds.has(l.id));

  const formattedOwned = ownedLabs.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    isOwner: true,
    role: "OWNER",
    membersCount: l._count.members,
  }));

  const formattedJoined = joinedLabs.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    isOwner: false,
    role: "MEMBER",
    membersCount: l._count.members,
  }));

  return c.json({
    labs: [...formattedOwned, ...formattedJoined],
  });
});

// POST /logbook/labs - Create new Lab Workspace
logbookRoutes.post("/labs", async (c) => {
  const authUser = c.get("user");
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || !String(body.name).trim()) {
    throw new HTTPException(400, { message: "Lab Workspace Name is required" });
  }

  const name = String(body.name).trim();
  const description = body.description ? String(body.description).trim() : null;

  const lab = await prisma.labWorkspace.create({
    data: {
      name,
      description,
      ownerId: authUser.sub,
      members: {
        create: {
          userId: authUser.sub,
          role: "OWNER",
          canViewLogbook: true,
          canCreateEntries: true,
          canEditOwnEntries: true,
          canEditOthersEntries: true,
          canManageInstruments: true,
          canGenerateReports: true,
        },
      },
    },
  });

  await seedDefaultInstrumentsForLab(lab.id);

  return c.json({ lab });
});

// ─────────────────────────────────────────────
// TEAM & INVITATIONS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/labs/:labId/team - Fetch active team members & pending invites
logbookRoutes.get("/labs/:labId/team", async (c) => {
  const authUser = c.get("user");
  const labId = c.req.param("labId");

  const { lab, isOwner, role } = await resolveLabAndPermissions(authUser.sub, labId);

  // Active members
  const members = await prisma.labMember.findMany({
    where: { labId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formattedMembers = members.map((m) => ({
    id: m.userId,
    memberId: m.id,
    name: m.user.name || m.user.email.split("@")[0],
    email: m.user.email,
    role: m.role,
    avatarUrl: m.user.avatarUrl,
    designation: m.user.designation,
    permissions: {
      canViewLogbook: m.canViewLogbook,
      canCreateEntries: m.canCreateEntries,
      canEditOwnEntries: m.canEditOwnEntries,
      canEditOthersEntries: m.canEditOthersEntries,
      canManageInstruments: m.canManageInstruments,
      canGenerateReports: m.canGenerateReports,
    },
  }));

  // Pending invites
  const invites = await prisma.labInvite.findMany({
    where: { labId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const formattedInvites = invites.map((inv) => ({
    id: inv.id,
    email: inv.inviteeEmail,
    token: inv.token,
    status: inv.status,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  }));

  return c.json({
    labId,
    labName: lab.name,
    isOwner,
    userRole: role,
    members: formattedMembers,
    pendingInvites: formattedInvites,
  });
});

// POST /logbook/labs/:labId/invites - Invite team member by email
logbookRoutes.post("/labs/:labId/invites", async (c) => {
  const authUser = c.get("user");
  const labId = c.req.param("labId");

  const { isOwner, role, lab } = await resolveLabAndPermissions(authUser.sub, labId);
  if (!isOwner && role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only the Lab Owner or Admin can invite team members" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !String(body.email).trim()) {
    throw new HTTPException(400, { message: "Invitee Email is required" });
  }

  const inviteeEmail = String(body.email).trim().toLowerCase();

  // Check if user is already an active member of this lab
  const existingUser = await prisma.user.findUnique({ where: { email: inviteeEmail } });
  if (existingUser) {
    const activeMember = await prisma.labMember.findUnique({
      where: { labId_userId: { labId, userId: existingUser.id } },
    });
    if (activeMember) {
      throw new HTTPException(409, { message: `'${inviteeEmail}' is already an active member of this lab` });
    }
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.labInvite.create({
    data: {
      labId,
      inviterId: authUser.sub,
      inviteeEmail,
      token,
      status: "PENDING",
      expiresAt,
    },
  });

  const inviterUser = await getUserWithRole(authUser.sub);
  const displayName = inviterUser.name || inviterUser.email;

  await logActivity(authUser.sub, displayName, "MEMBER_INVITED", `Sent invitation to ${inviteeEmail} for ${lab.name}`, labId);

  // Send invite email (fire-and-forget; don't fail the request if email isn't configured)
  const acceptUrl = `${FRONTEND_ORIGIN}/cyrosearch?tab=logbook&inviteToken=${token}`;
  sendLogbookInviteEmail({
    to: inviteeEmail,
    inviterName: displayName,
    labName: lab.name,
    acceptUrl,
  }).catch((err) => console.error("[email] Failed to send logbook invite email:", err));

  return c.json({
    success: true,
    invite: {
      id: invite.id,
      email: invite.inviteeEmail,
      token: invite.token,
      status: invite.status,
      expiresAt: invite.expiresAt,
    },
  });
});

// DELETE /logbook/labs/:labId/invites/:inviteId - Cancel invite
logbookRoutes.delete("/labs/:labId/invites/:inviteId", async (c) => {
  const authUser = c.get("user");
  const labId = c.req.param("labId");
  const inviteId = c.req.param("inviteId");

  const { isOwner, role } = await resolveLabAndPermissions(authUser.sub, labId);
  if (!isOwner && role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Lab Owner or Admin can cancel invitations" });
  }

  await prisma.labInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });

  return c.json({ success: true });
});

// POST /logbook/invites/accept - Accept invitation link
logbookRoutes.post("/invites/accept", async (c) => {
  const authUser = c.get("user");
  const body = await c.req.json().catch(() => null);

  if (!body || !body.token) {
    throw new HTTPException(400, { message: "Invitation token required" });
  }

  const invite = await prisma.labInvite.findUnique({
    where: { token: String(body.token).trim() },
    include: { lab: true },
  });

  if (!invite || invite.status !== "PENDING") {
    throw new HTTPException(404, { message: "Invalid or expired invitation" });
  }

  if (invite.expiresAt < new Date()) {
    await prisma.labInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new HTTPException(400, { message: "Invitation has expired" });
  }

  // Create LabMember record
  const member = await prisma.labMember.upsert({
    where: { labId_userId: { labId: invite.labId, userId: authUser.sub } },
    create: {
      labId: invite.labId,
      userId: authUser.sub,
      role: "MEMBER",
      canViewLogbook: true,
      canCreateEntries: true,
      canEditOwnEntries: true,
      canEditOthersEntries: false,
      canManageInstruments: false,
      canGenerateReports: false,
    },
    update: {},
  });

  // Mark invite as accepted
  await prisma.labInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED" },
  });

  const acceptorUser = await getUserWithRole(authUser.sub);
  const displayName = acceptorUser.name || acceptorUser.email;

  await logActivity(authUser.sub, displayName, "MEMBER_JOINED", `${displayName} accepted invitation and joined ${invite.lab.name}`, invite.labId);

  return c.json({
    success: true,
    labId: invite.labId,
    labName: invite.lab.name,
    memberId: member.id,
  });
});

// PATCH /logbook/labs/:labId/members/:memberUserId - Update member permissions
logbookRoutes.patch("/labs/:labId/members/:memberUserId", async (c) => {
  const authUser = c.get("user");
  const labId = c.req.param("labId");
  const memberUserId = c.req.param("memberUserId");

  const { isOwner, role } = await resolveLabAndPermissions(authUser.sub, labId);
  if (!isOwner && role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Laboratory Owner/Admin can update team permissions" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    throw new HTTPException(400, { message: "Request body required" });
  }

  const updated = await prisma.labMember.update({
    where: { labId_userId: { labId, userId: memberUserId } },
    data: {
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

// GET /logbook/permissions - Fallback backward compatibility endpoint
logbookRoutes.get("/permissions", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, isOwner, role } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  const members = await prisma.labMember.findMany({
    where: { labId: lab.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const formattedUsers = members.map((m) => ({
    id: m.userId,
    name: m.user.name || m.user.email.split("@")[0],
    email: m.user.email,
    role: m.role,
    avatarUrl: m.user.avatarUrl,
    designation: m.user.designation,
    permissions: {
      canViewLogbook: m.canViewLogbook,
      canCreateEntries: m.canCreateEntries,
      canEditOwnEntries: m.canEditOwnEntries,
      canEditOthersEntries: m.canEditOthersEntries,
      canManageInstruments: m.canManageInstruments,
      canGenerateReports: m.canGenerateReports,
    },
  }));

  return c.json({ users: formattedUsers, labId: lab.id, isOwner, role });
});

// PATCH /logbook/permissions/:userId - Fallback backward compatibility permission update
logbookRoutes.patch("/permissions/:userId", async (c) => {
  const authUser = c.get("user");
  const targetUserId = c.req.param("userId");
  const requestedLabId = c.req.query("labId");

  const { lab } = await resolveLabAndPermissions(authUser.sub, requestedLabId);
  const body = await c.req.json().catch(() => null);

  const updated = await prisma.labMember.update({
    where: { labId_userId: { labId: lab.id, userId: targetUserId } },
    data: {
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
// INSTRUMENTS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/instruments - List instruments for active lab workspace
logbookRoutes.get("/instruments", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "Access denied to Logbook" });
  }

  const instruments = await prisma.instrument.findMany({
    where: { labId: lab.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    include: {
      bookings: {
        where: { status: "CONFIRMED" },
        orderBy: { startDateTime: "asc" },
      },
    },
  });

  const todayStr = getTodayString();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enriched = instruments.map((inst) => {
    const todayBookings = inst.bookings.filter((b) => {
      const bDateStr = b.date.toISOString().split("T")[0];
      return bDateStr === todayStr;
    });

    const nextBooking = todayBookings.find((b) => b.startDateTime >= now) || todayBookings[0] || null;
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

  return c.json({ instruments: enriched, permissions, labId: lab.id, labName: lab.name });
});

// GET /logbook/instruments/:id
logbookRoutes.get("/instruments/:id", async (c) => {
  const authUser = c.get("user");
  const instId = c.req.param("id");
  const requestedLabId = c.req.query("labId");

  const { permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);
  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "Access denied" });
  }

  const instrument = await prisma.instrument.findUnique({
    where: { id: instId },
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

// POST /logbook/instruments
logbookRoutes.post("/instruments", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can manage instruments" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.name || !body.code) {
    throw new HTTPException(400, { message: "Instrument Name and Code are required" });
  }

  const code = String(body.code).trim();
  const existing = await prisma.instrument.findFirst({
    where: { code, labId: lab.id },
  });

  if (existing) {
    throw new HTTPException(409, { message: `Instrument code '${code}' already exists in this lab` });
  }

  const instrument = await prisma.instrument.create({
    data: {
      code,
      name: String(body.name).trim(),
      installedOn: body.installedOn ? new Date(body.installedOn) : null,
      lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : null,
      lastCleaningDate: body.lastCleaningDate ? new Date(body.lastCleaningDate) : null,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      inchargeName: body.inchargeName ? String(body.inchargeName).trim() : null,
      inchargeContact: body.inchargeContact ? String(body.inchargeContact).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      status: body.status || "ACTIVE",
      labId: lab.id,
    },
  });

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_ADDED", `${instrument.name} (${instrument.code}) added`, lab.id, instrument.id);

  return c.json({ instrument });
});

// PATCH /logbook/instruments/:id
logbookRoutes.patch("/instruments/:id", async (c) => {
  const authUser = c.get("user");
  const instId = c.req.param("id");
  const requestedLabId = c.req.query("labId");

  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);
  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can manage instruments" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Request body required" });

  const instrument = await prisma.instrument.update({
    where: { id: instId },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.code !== undefined && { code: String(body.code).trim() }),
      ...(body.installedOn !== undefined && { installedOn: body.installedOn ? new Date(body.installedOn) : null }),
      ...(body.lastServiceDate !== undefined && { lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : null }),
      ...(body.lastCleaningDate !== undefined && { lastCleaningDate: body.lastCleaningDate ? new Date(body.lastCleaningDate) : null }),
      ...(body.nextServiceDate !== undefined && { nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null }),
      ...(body.inchargeName !== undefined && { inchargeName: body.inchargeName ? String(body.inchargeName).trim() : null }),
      ...(body.inchargeContact !== undefined && { inchargeContact: body.inchargeContact ? String(body.inchargeContact).trim() : null }),
      ...(body.description !== undefined && { description: body.description ? String(body.description).trim() : null }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_UPDATED", `${instrument.name} details updated`, lab.id, instrument.id);

  return c.json({ instrument });
});

// DELETE /logbook/instruments/:id
logbookRoutes.delete("/instruments/:id", async (c) => {
  const authUser = c.get("user");
  const instId = c.req.param("id");
  const requestedLabId = c.req.query("labId");

  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);
  if (!permissions.canManageInstruments) {
    throw new HTTPException(403, { message: "Only lab admins can archive instruments" });
  }

  const instrument = await prisma.instrument.update({
    where: { id: instId },
    data: { status: "ARCHIVED" },
  });

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "INSTRUMENT_ARCHIVED", `${instrument.name} was archived`, lab.id, instrument.id);

  return c.json({ success: true, instrument });
});

// ─────────────────────────────────────────────
// BOOKINGS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/bookings
logbookRoutes.get("/bookings", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");

  const { permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);
  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "Access denied" });
  }

  const instrumentId = c.req.query("instrumentId");
  const dateStr = c.req.query("date");

  const whereClause: Record<string, unknown> = {
    status: "CONFIRMED",
  };

  if (instrumentId) whereClause.instrumentId = instrumentId;
  if (dateStr) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    whereClause.date = d;
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

// POST /logbook/bookings
logbookRoutes.post("/bookings", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canCreateEntries) {
    throw new HTTPException(403, { message: "You do not have permission to create instrument bookings" });
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.instrumentId || !body.date || !body.startTime || !body.endTime) {
    throw new HTTPException(400, { message: "instrumentId, date, startTime, and endTime are required" });
  }

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  const dateObj = new Date(`${body.date}T00:00:00.000Z`);
  const startDT = new Date(`${body.date}T${body.startTime}:00.000Z`);
  const endDT = new Date(`${body.date}T${body.endTime}:00.000Z`);

  if (endDT <= startDT) {
    throw new HTTPException(400, { message: "End time must be after start time" });
  }

  // Conflict check
  const conflict = await prisma.instrumentBooking.findFirst({
    where: {
      instrumentId: String(body.instrumentId),
      status: "CONFIRMED",
      date: dateObj,
      OR: [
        { startDateTime: { lt: endDT }, endDateTime: { gt: startDT } },
      ],
    },
  });

  if (conflict) {
    throw new HTTPException(409, { message: `Time slot ${body.startTime} - ${body.endTime} conflicts with an existing booking (${conflict.userName})` });
  }

  const booking = await prisma.instrumentBooking.create({
    data: {
      instrumentId: String(body.instrumentId),
      userId: authUser.sub,
      userName: displayName,
      date: dateObj,
      startTime: String(body.startTime),
      endTime: String(body.endTime),
      startDateTime: startDT,
      endDateTime: endDT,
      remarks: body.remarks ? String(body.remarks).trim() : null,
      createdBy: authUser.sub,
    },
    include: {
      instrument: true,
    },
  });

  await logActivity(authUser.sub, displayName, "BOOKING_CREATED", `Booked ${booking.instrument.name} for ${body.date} (${body.startTime} - ${body.endTime})`, lab.id, booking.instrumentId);

  return c.json({ booking });
});

// DELETE /logbook/bookings/:id - Cancel booking
logbookRoutes.delete("/bookings/:id", async (c) => {
  const authUser = c.get("user");
  const bookingId = c.req.param("id");
  const requestedLabId = c.req.query("labId");

  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  const booking = await prisma.instrumentBooking.findUnique({
    where: { id: bookingId },
    include: { instrument: true },
  });

  if (!booking) throw new HTTPException(404, { message: "Booking not found" });

  const isOwner = booking.userId === authUser.sub;
  if (!isOwner && !permissions.canEditOthersEntries) {
    throw new HTTPException(403, { message: "You can only cancel your own bookings" });
  }

  const updated = await prisma.instrumentBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  await logActivity(authUser.sub, displayName, "BOOKING_CANCELLED", `Cancelled booking for ${booking.instrument.name} on ${booking.startTime}`, lab.id, booking.instrumentId);

  return c.json({ success: true, booking: updated });
});

// ─────────────────────────────────────────────
// ACTIVITIES ENDPOINT
// ─────────────────────────────────────────────

logbookRoutes.get("/activities", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  const instrumentId = c.req.query("instrumentId");

  const whereClause: Record<string, unknown> = {
    OR: [{ labId: lab.id }, { labId: null }],
  };
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

logbookRoutes.get("/reports", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

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

  if (instrumentId && instrumentId !== "ALL") whereClause.instrumentId = instrumentId;
  if (userId && userId !== "ALL") whereClause.userId = userId;

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

// Helper: write notebook activity log (fire-and-forget)
async function logNotebookActivity(
  userId: string,
  userName: string,
  action: string,
  details: string,
  labId?: string | null,
  entryId?: string | null,
  targetUserId?: string | null,
) {
  try {
    await prisma.notebookActivityLog.create({
      data: {
        userId,
        userName,
        action,
        details,
        labId: labId || null,
        entryId: entryId || null,
        targetUserId: targetUserId || null,
      },
    });
  } catch (err) {
    console.error("Failed to write notebook activity:", err);
  }
}

// GET /logbook/notebook — fetch single entry by date (own entry only)
logbookRoutes.get("/notebook", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "You do not have permission to view the notebook" });
  }

  const dateStr = c.req.query("date") || getTodayString();
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  const entry = await prisma.labNotebookEntry.findFirst({
    where: {
      date: dateObj,
      userId: authUser.sub,
      OR: [{ labId: lab.id }, { labId: null }],
    },
  });

  return c.json({ date: dateStr, entry: entry || null });
});

// POST /logbook/notebook — create or update own entry for a date (rich content)
logbookRoutes.post("/notebook", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  const dbUser = await getUserWithRole(authUser.sub);
  const displayName = dbUser.name || dbUser.email;

  const body = await c.req.json().catch(() => null);
  if (!body || body.content === undefined) {
    throw new HTTPException(400, { message: "Content required" });
  }

  const dateStr = body.date || getTodayString();
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  // Find existing entry for this user+lab+date
  const existing = await prisma.labNotebookEntry.findFirst({
    where: { date: dateObj, userId: authUser.sub, labId: lab.id },
  });

  const isNew = !existing;

  if (existing) {
    // Editing own entry — requires canEditOwnEntries
    if (!permissions.canEditOwnEntries) {
      throw new HTTPException(403, { message: "You do not have permission to edit notebook entries" });
    }
  } else {
    // Creating new entry — requires canCreateEntries
    if (!permissions.canCreateEntries) {
      throw new HTTPException(403, { message: "You do not have permission to create notebook entries" });
    }
  }

  let entry;
  if (existing) {
    entry = await prisma.labNotebookEntry.update({
      where: { id: existing.id },
      data: {
        content: String(body.content),
        richContent: body.richContent ?? undefined,
        entryTime: body.entryTime ? String(body.entryTime) : undefined,
        summary: body.summary ? String(body.summary).slice(0, 200) : undefined,
        userName: displayName,
      },
    });
  } else {
    entry = await prisma.labNotebookEntry.create({
      data: {
        date: dateObj,
        userId: authUser.sub,
        userName: displayName,
        content: String(body.content),
        richContent: body.richContent ?? undefined,
        entryTime: body.entryTime ? String(body.entryTime) : null,
        summary: body.summary ? String(body.summary).slice(0, 200) : null,
        labId: lab.id,
      },
    });
  }

  await logNotebookActivity(
    authUser.sub,
    displayName,
    isNew ? "ENTRY_CREATED" : "ENTRY_UPDATED",
    `${isNew ? "Created" : "Updated"} notebook entry for ${dateStr}`,
    lab.id,
    entry.id,
  );

  return c.json({ entry });
});

// GET /logbook/notebook/history — list all dates with entries for the current user
logbookRoutes.get("/notebook/history", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { lab, permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canViewLogbook) {
    throw new HTTPException(403, { message: "Access denied" });
  }

  const entries = await prisma.labNotebookEntry.findMany({
    where: { userId: authUser.sub, OR: [{ labId: lab.id }, { labId: null }] },
    select: {
      id: true,
      date: true,
      summary: true,
      entryTime: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { date: "desc" },
    take: 365,
  });

  const history = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().split("T")[0],
    summary: e.summary,
    entryTime: e.entryTime,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return c.json({ history });
});

// POST /logbook/notebook/image — upload image for a notebook entry (multipart)
logbookRoutes.post("/notebook/image", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const { permissions } = await resolveLabAndPermissions(authUser.sub, requestedLabId);

  if (!permissions.canCreateEntries && !permissions.canEditOwnEntries) {
    throw new HTTPException(403, { message: "No permission to upload notebook images" });
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw new HTTPException(400, { message: "Multipart form data required" });

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: "image field required" });
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new HTTPException(413, { message: "Image must be under 5 MB" });
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new HTTPException(415, { message: "Only JPEG, PNG, GIF, WEBP images are allowed" });
  }

  const { uploadImageToCloudinary, toCloudinaryStorageKey, getCloudinaryImageUrl } = await import("../lib/cloudinary.js");
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadImageToCloudinary(buffer);
  const storageKey = toCloudinaryStorageKey(result.public_id);
  const url = getCloudinaryImageUrl(result.public_id);

  return c.json({ url, storageKey, publicId: result.public_id });
});

// ─────────────────────────────────────────────
// ADMIN NOTEBOOK MULTI-USER VIEW
// ─────────────────────────────────────────────

// GET /logbook/notebook/admin/users — get up to 4 users' notebooks (admin only)
logbookRoutes.get("/notebook/admin/users", async (c) => {
  const authUser = c.get("user");
  const dbUser = await getUserWithRole(authUser.sub);
  if (dbUser.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Super Administrators can view multi-user notebooks" });
  }

  // userIds=id1,id2,id3,id4 (max 4)
  const userIdsParam = c.req.query("userIds") || "";
  const dateStr = c.req.query("date") || getTodayString();
  const labId = c.req.query("labId");

  const userIds = userIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (userIds.length === 0) {
    return c.json({ notebooks: [] });
  }

  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  const entries = await prisma.labNotebookEntry.findMany({
    where: {
      userId: { in: userIds },
      date: dateObj,
      ...(labId ? { labId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  // Also fetch user info for users with no entry that day
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  const notebooks = users.map((u) => {
    const entry = entries.find((e) => e.userId === u.id) || null;
    return {
      userId: u.id,
      userName: u.name || u.email,
      userEmail: u.email,
      avatarUrl: u.avatarUrl,
      entry: entry
        ? {
            id: entry.id,
            date: entry.date.toISOString().split("T")[0],
            content: entry.content,
            richContent: entry.richContent,
            entryTime: entry.entryTime,
            summary: entry.summary,
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
          }
        : null,
    };
  });

  return c.json({ notebooks, date: dateStr });
});

// GET /logbook/notebook/admin/history — history for a specific user (admin only)
logbookRoutes.get("/notebook/admin/history", async (c) => {
  const authUser = c.get("user");
  const dbUser = await getUserWithRole(authUser.sub);
  if (dbUser.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Super Administrators can view user notebook history" });
  }

  const targetUserId = c.req.query("userId");
  if (!targetUserId) throw new HTTPException(400, { message: "userId required" });

  const labId = c.req.query("labId");

  const entries = await prisma.labNotebookEntry.findMany({
    where: {
      userId: targetUserId,
      ...(labId ? { labId } : {}),
    },
    select: {
      id: true,
      date: true,
      summary: true,
      entryTime: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { date: "desc" },
    take: 365,
  });

  return c.json({
    history: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString().split("T")[0],
      summary: e.summary,
      entryTime: e.entryTime,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  });
});

// ─────────────────────────────────────────────
// NOTEBOOK TASKS ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/notebook/tasks — get tasks (admin: all in lab; user: own assigned tasks)
logbookRoutes.get("/notebook/tasks", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const dbUser = await getUserWithRole(authUser.sub);

  let labId: string | null = requestedLabId || null;

  if (!labId) {
    const activeLab = await ensureUserLabWorkspace(authUser.sub);
    labId = activeLab.id;
  }

  const isAdmin = dbUser.role === "ADMIN";

  const tasks = await prisma.notebookTask.findMany({
    where: {
      ...(labId ? { labId } : {}),
      ...(isAdmin ? {} : { assignedToId: authUser.sub }),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      labId: t.labId,
      title: t.title,
      description: t.description,
      dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      status: t.status,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      completedNote: t.completedNote,
      createdAt: t.createdAt.toISOString(),
      assignedTo: {
        id: t.assignedTo.id,
        name: t.assignedTo.name || t.assignedTo.email,
        email: t.assignedTo.email,
        avatarUrl: t.assignedTo.avatarUrl,
      },
      assignedBy: {
        id: t.assignedBy.id,
        name: t.assignedBy.name || t.assignedBy.email,
        email: t.assignedBy.email,
      },
    })),
  });
});

// POST /logbook/notebook/tasks — assign a new task (admin/owner only)
logbookRoutes.post("/notebook/tasks", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const dbUser = await getUserWithRole(authUser.sub);

  // Resolve lab; also checks membership
  let labId: string | null = requestedLabId || null;
  if (labId) {
    const { isOwner, role: memberRole } = await resolveLabAndPermissions(authUser.sub, labId);
    if (dbUser.role !== "ADMIN" && !isOwner && memberRole !== "ADMIN") {
      throw new HTTPException(403, { message: "Only Admin or Lab Owner can assign tasks" });
    }
  } else {
    const activeLab = await ensureUserLabWorkspace(authUser.sub);
    labId = activeLab.id;
    if (dbUser.role !== "ADMIN" && activeLab.ownerId !== authUser.sub) {
      throw new HTTPException(403, { message: "Only Admin or Lab Owner can assign tasks" });
    }
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.assignedToId || !body.title) {
    throw new HTTPException(400, { message: "assignedToId and title are required" });
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: String(body.assignedToId) },
    select: { id: true, name: true, email: true },
  });
  if (!targetUser) throw new HTTPException(404, { message: "Assigned user not found" });

  const task = await prisma.notebookTask.create({
    data: {
      labId,
      assignedToId: targetUser.id,
      assignedById: authUser.sub,
      title: String(body.title).trim(),
      description: body.description ? String(body.description).trim() : null,
      dueDate: body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null,
      status: "PENDING",
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  });

  const displayName = dbUser.name || dbUser.email;
  const targetName = targetUser.name || targetUser.email;

  await logNotebookActivity(
    authUser.sub,
    displayName,
    "TASK_ASSIGNED",
    `Task "${task.title}" assigned to ${targetName}`,
    labId,
    null,
    targetUser.id,
  );

  return c.json({ task });
});

// PATCH /logbook/notebook/tasks/:taskId — update status (complete by assignee; admin can cancel/edit)
logbookRoutes.patch("/notebook/tasks/:taskId", async (c) => {
  const authUser = c.get("user");
  const taskId = c.req.param("taskId");
  const dbUser = await getUserWithRole(authUser.sub);

  const task = await prisma.notebookTask.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
  if (!task) throw new HTTPException(404, { message: "Task not found" });

  const body = await c.req.json().catch(() => null);
  if (!body) throw new HTTPException(400, { message: "Request body required" });

  const isAdmin = dbUser.role === "ADMIN";
  const isAssignee = task.assignedToId === authUser.sub;

  // Only the assigned user can mark as completed; admin can do anything
  if (body.status === "COMPLETED") {
    if (!isAssignee && !isAdmin) {
      throw new HTTPException(403, { message: "Only the assigned user can mark this task as completed" });
    }
  } else if (!isAdmin) {
    // Non-admin, non-assignee cannot change status to anything except COMPLETED
    if (!isAssignee) {
      throw new HTTPException(403, { message: "You do not have permission to update this task" });
    }
    // Assignee can only set IN_PROGRESS or COMPLETED
    if (body.status && !["IN_PROGRESS", "COMPLETED"].includes(body.status)) {
      throw new HTTPException(403, { message: "You can only mark tasks as In Progress or Completed" });
    }
  }

  const displayName = dbUser.name || dbUser.email;

  const updated = await prisma.notebookTask.update({
    where: { id: taskId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.status === "COMPLETED" && {
        completedAt: new Date(),
        completedNote: body.completedNote ? String(body.completedNote).trim() : null,
      }),
      ...(isAdmin && body.title !== undefined && { title: String(body.title).trim() }),
      ...(isAdmin && body.description !== undefined && { description: body.description ? String(body.description).trim() : null }),
      ...(isAdmin && body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null }),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (body.status === "COMPLETED") {
    await logNotebookActivity(
      authUser.sub,
      displayName,
      "TASK_COMPLETED",
      `Task "${task.title}" marked as completed`,
      task.labId,
      null,
      task.assignedToId,
    );
  }

  return c.json({ task: updated });
});

// DELETE /logbook/notebook/tasks/:taskId — cancel/delete task (admin only)
logbookRoutes.delete("/notebook/tasks/:taskId", async (c) => {
  const authUser = c.get("user");
  const taskId = c.req.param("taskId");
  const dbUser = await getUserWithRole(authUser.sub);

  if (dbUser.role !== "ADMIN") {
    // Check if lab owner
    const task = await prisma.notebookTask.findUnique({ where: { id: taskId } });
    if (!task) throw new HTTPException(404, { message: "Task not found" });
    if (task.labId) {
      const lab = await prisma.labWorkspace.findUnique({ where: { id: task.labId } });
      if (!lab || lab.ownerId !== authUser.sub) {
        throw new HTTPException(403, { message: "Only Admin or Lab Owner can delete tasks" });
      }
    } else {
      throw new HTTPException(403, { message: "Only Admin can delete tasks" });
    }
  }

  await prisma.notebookTask.delete({ where: { id: taskId } });
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// NOTEBOOK ACTIVITY LOG ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/notebook/activity — admin gets full log; user gets own actions only
logbookRoutes.get("/notebook/activity", async (c) => {
  const authUser = c.get("user");
  const requestedLabId = c.req.query("labId");
  const dbUser = await getUserWithRole(authUser.sub);

  const isAdmin = dbUser.role === "ADMIN";

  let labId: string | null = requestedLabId || null;
  if (!labId && !isAdmin) {
    const activeLab = await ensureUserLabWorkspace(authUser.sub);
    labId = activeLab.id;
  }

  const logs = await prisma.notebookActivityLog.findMany({
    where: {
      ...(labId ? { labId } : {}),
      // Non-admin users only see their own actions
      ...(!isAdmin ? { userId: authUser.sub } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return c.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.userName,
      action: l.action,
      details: l.details,
      labId: l.labId,
      entryId: l.entryId,
      targetUserId: l.targetUserId,
      createdAt: l.createdAt.toISOString(),
    })),
    isAdmin,
  });
});

// ─────────────────────────────────────────────
// SUPER ADMIN LOGBOOK OVERVIEW ENDPOINTS
// ─────────────────────────────────────────────

// GET /logbook/admin/overview - System-wide stats, labs, bookings, notebooks & activity
logbookRoutes.get("/admin/overview", async (c) => {
  const authUser = c.get("user");
  const dbUser = await getUserWithRole(authUser.sub);

  if (dbUser.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Super Administrators can access the Admin Logbook Overview" });
  }

  const filterLabId = c.req.query("labId");
  const filterUserId = c.req.query("userId");
  const fromDateStr = c.req.query("fromDate");
  const toDateStr = c.req.query("toDate");

  // System Stats
  const totalLabs = await prisma.labWorkspace.count();
  const totalInstruments = await prisma.instrument.count({ where: { status: { not: "ARCHIVED" } } });
  const totalBookings = await prisma.instrumentBooking.count({ where: { status: "CONFIRMED" } });
  const totalNotebookEntries = await prisma.labNotebookEntry.count();
  const totalMembers = await prisma.labMember.count();

  // All Labs List
  const labs = await prisma.labWorkspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, instruments: true } },
    },
  });

  const formattedLabs = labs.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    createdAt: l.createdAt.toISOString(),
    owner: {
      id: l.owner.id,
      name: l.owner.name || l.owner.email.split("@")[0],
      email: l.owner.email,
    },
    membersCount: l._count.members,
    instrumentsCount: l._count.instruments,
  }));

  // All Users List
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: "asc" },
  });

  // Master Bookings
  const bookingWhere: Record<string, unknown> = {};
  if (filterLabId && filterLabId !== "ALL") {
    bookingWhere.instrument = { labId: filterLabId };
  }
  if (filterUserId && filterUserId !== "ALL") {
    bookingWhere.userId = filterUserId;
  }
  if (fromDateStr && toDateStr) {
    const start = new Date(`${fromDateStr}T00:00:00.000Z`);
    const end = new Date(`${toDateStr}T23:59:59.999Z`);
    bookingWhere.startDateTime = { gte: start, lte: end };
  }

  const bookings = await prisma.instrumentBooking.findMany({
    where: bookingWhere,
    orderBy: { startDateTime: "desc" },
    take: 300,
    include: {
      instrument: { select: { id: true, name: true, code: true, labId: true, lab: { select: { name: true } } } },
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const formattedBookings = bookings.map((b) => ({
    id: b.id,
    instrumentId: b.instrumentId,
    instrumentName: b.instrument.name,
    instrumentCode: b.instrument.code,
    labId: b.instrument.labId,
    labName: b.instrument.lab?.name || "Global Lab",
    userId: b.userId,
    userName: b.user.name || b.userName,
    userEmail: b.user.email,
    date: b.date.toISOString().split("T")[0],
    startTime: b.startTime,
    endTime: b.endTime,
    remarks: b.remarks || "-",
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  }));

  // Master Lab Notebook Entries
  const notebookWhere: Record<string, unknown> = {};
  if (filterLabId && filterLabId !== "ALL") {
    notebookWhere.labId = filterLabId;
  }
  if (filterUserId && filterUserId !== "ALL") {
    notebookWhere.userId = filterUserId;
  }

  const notebooks = await prisma.labNotebookEntry.findMany({
    where: notebookWhere,
    orderBy: { date: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
      lab: { select: { id: true, name: true } },
    },
  });

  const formattedNotebooks = notebooks.map((n) => ({
    id: n.id,
    date: n.date.toISOString().split("T")[0],
    userId: n.userId,
    userName: n.user.name || n.userName,
    userEmail: n.user.email,
    labId: n.labId,
    labName: n.lab?.name || "Personal Logbook",
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  }));

  // Global Activities
  const activities = await prisma.logbookActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return c.json({
    stats: {
      totalLabs,
      totalInstruments,
      totalBookings,
      totalNotebookEntries,
      totalMembers,
    },
    labs: formattedLabs,
    users,
    bookings: formattedBookings,
    notebooks: formattedNotebooks,
    activities,
  });
});

// DELETE /logbook/admin/labs/:labId - Admin Delete Lab Workspace
logbookRoutes.delete("/admin/labs/:labId", async (c) => {
  const authUser = c.get("user");
  const dbUser = await getUserWithRole(authUser.sub);

  if (dbUser.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Super Administrators can delete lab workspaces" });
  }

  const labId = c.req.param("labId");
  await prisma.labWorkspace.delete({ where: { id: labId } });

  return c.json({ success: true });
});

// DELETE /logbook/admin/bookings/:bookingId - Admin Cancel/Delete Booking
logbookRoutes.delete("/admin/bookings/:bookingId", async (c) => {
  const authUser = c.get("user");
  const dbUser = await getUserWithRole(authUser.sub);

  if (dbUser.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Super Administrators can cancel user bookings" });
  }

  const bookingId = c.req.param("bookingId");
  const updated = await prisma.instrumentBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  return c.json({ success: true, booking: updated });
});

