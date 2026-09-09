import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { sendCryoInviteEmail } from "../lib/email.js";

export const cryoSearchRoutes = new Hono<{ Variables: AuthVariables }>();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3001";
const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

type CellElement = {
  id: string;
  isEmpty: boolean;
  name: string;
  boxIndex: number;
  passage: number;
  storedOn: string;
  storedBy: string;
  entryId: string;
  extractedBy: string;
  extractedOn: string;
  remarksWhenStored: string;
  ratingsWhenStored: number;
  feedbackWhenExtracted: string;
  ratingsWhenExtracted: number;
  isCellSelectedByUser?: boolean;
};

type BoxModel = {
  id: string;
  name: string;
  location: string;
  locationNames: string[];
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  dimension: number;
  boxCells: CellElement[];
};

type RackModel = {
  id: string;
  name: string;
  location: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  boxes: BoxModel[];
};

type ContainerModel = {
  id: string;
  name: string;
  location: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  racks: RackModel[];
};

type LabModel = {
  id: string;
  name: string;
  admin: string;
  adminName?: string;
  allowedUsers: string[];
  allowedCellLine: string[];
  containers: ContainerModel[];
};

type AllowedUsersModel = {
  userId: string;
  userName: string;
  userImage: string;
  allowedItem: string;
  allowedItemType: string;
  allowedItemName: string[];
};

type CryoState = {
  labs: LabModel[];
  activities: unknown[];
  receivedRequests: unknown[];
  sentRequests: unknown[];
  allowedUsers: AllowedUsersModel[];
};

const emptyState: CryoState = {
  labs: [],
  activities: [],
  receivedRequests: [],
  sentRequests: [],
  allowedUsers: [],
};

/**
 * Resolve item metadata from the owner's labs JSON.
 * Returns null if the itemId isn't found.
 */
function resolveItem(
  labs: LabModel[],
  itemId: string
): { itemType: string; itemPath: string[] } | null {
  for (const lab of labs) {
    if (lab.id === itemId) {
      return { itemType: "Lab", itemPath: [lab.name] };
    }
    for (const cont of lab.containers) {
      if (cont.id === itemId) {
        return { itemType: "Container", itemPath: [lab.name, cont.name] };
      }
      for (const rack of cont.racks) {
        if (rack.id === itemId) {
          return { itemType: "Rack", itemPath: [lab.name, cont.name, rack.name] };
        }
        for (const box of rack.boxes) {
          if (box.id === itemId) {
            return {
              itemType: "Box",
              itemPath: [lab.name, cont.name, rack.name, box.name],
            };
          }
        }
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// State endpoints (existing, unchanged)
// ─────────────────────────────────────────────

cryoSearchRoutes.use("*", requireAuth);

cryoSearchRoutes.get("/state", async (c) => {
  const userId = c.get("user").sub;
  const state = await prisma.cryoSearchState.findUnique({ where: { userId } });
  return c.json(state ?? emptyState);
});

cryoSearchRoutes.put("/state", async (c) => {
  const userId = c.get("user").sub;
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw new HTTPException(400, { message: "Invalid CryoSearch state" });
  }

  const state = body as Record<string, unknown>;
  const data = {
    labs: state.labs ?? [],
    activities: state.activities ?? [],
    receivedRequests: state.receivedRequests ?? [],
    sentRequests: state.sentRequests ?? [],
    allowedUsers: state.allowedUsers ?? [],
  };

  const saved = await prisma.cryoSearchState.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return c.json(saved);
});

// ─────────────────────────────────────────────
// POST /cryosearch/invite
// Owner sends an email invite to a collaborator
// ─────────────────────────────────────────────

cryoSearchRoutes.post("/invite", async (c) => {
  const ownerId = c.get("user").sub;

  const body = (await c.req.json().catch(() => null)) as {
    email?: string;
    itemId?: string;
  } | null;

  if (!body) throw new HTTPException(400, { message: "Request body is required" });

  const email = body.email?.trim().toLowerCase();
  const itemId = body.itemId?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HTTPException(400, { message: "A valid email address is required" });
  }
  if (!itemId || !itemId.startsWith("lab")) {
    throw new HTTPException(400, {
      message: "A valid item ID is required (e.g. lab-xxx or lab-xxx-con-xxx)",
    });
  }

  // Resolve item from owner's state
  const ownerState = await prisma.cryoSearchState.findUnique({ where: { userId: ownerId } });
  const labs = (ownerState?.labs as unknown as LabModel[]) ?? [];
  const resolved = resolveItem(labs, itemId);

  if (!resolved) {
    throw new HTTPException(404, {
      message: "Item not found in your repository. Check the item ID.",
    });
  }

  // Get owner's display name
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { name: true, email: true },
  });
  const ownerName = owner?.name || owner?.email || "A collaborator";

  // Create invite token (expire any existing identical pending invites first)
  await prisma.cryoInvite.deleteMany({
    where: { ownerId, inviteeEmail: email, itemId, usedAt: null },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.cryoInvite.create({
    data: { token, ownerId, inviteeEmail: email, itemId, expiresAt },
  });

  // Send email (fire-and-forget; don't fail the request if Brevo isn't configured)
  const acceptUrl = `${FRONTEND_ORIGIN}/cyrosearch?invite=${token}`;
  await sendCryoInviteEmail({
    to: email,
    ownerName,
    itemPath: resolved.itemPath,
    itemType: resolved.itemType,
    acceptUrl,
  });

  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// GET /cryosearch/invite/:token
// Preview — public, no auth needed
// Returns invite metadata for the accept screen
// ─────────────────────────────────────────────

// Temporarily override the global requireAuth for this specific route by
// registering it directly on the app. Since Hono processes routes in order,
// we register this BEFORE the wildcard auth middleware by using a separate
// exported handler. We handle it inline with a manual auth-skip pattern.

cryoSearchRoutes.get("/invite/:token", async (c) => {
  // This route needs to be public — we skip auth by not calling requireAuth.
  // The global `use("*", requireAuth)` was already registered, but Hono's
  // middleware only applies to routes registered AFTER the middleware call.
  // Since this route IS after the use("*") call we need to handle the 401
  // gracefully. We'll re-register this public route on a separate router below.
  // (see publicCryoSearchRoutes)
  throw new HTTPException(404, { message: "Use the public invite preview endpoint" });
});

// ─────────────────────────────────────────────
// POST /cryosearch/invite/:token/accept
// Invitee accepts — auth required
// ─────────────────────────────────────────────

cryoSearchRoutes.post("/invite/:token/accept", async (c) => {
  const inviteeUserId = c.get("user").sub;
  const token = c.req.param("token");

  const invite = await prisma.cryoInvite.findUnique({ where: { token } });

  if (!invite) {
    throw new HTTPException(404, { message: "Invite not found or invalid" });
  }
  if (invite.usedAt) {
    throw new HTTPException(409, { message: "This invite has already been accepted" });
  }
  if (invite.expiresAt < new Date()) {
    throw new HTTPException(410, { message: "This invite has expired" });
  }

  // Verify the logged-in user's email matches the invite
  const inviteeUser = await prisma.user.findUnique({
    where: { id: inviteeUserId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  if (!inviteeUser) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  if (inviteeUser.email.toLowerCase() !== invite.inviteeEmail.toLowerCase()) {
    throw new HTTPException(403, {
      message: "This invite was sent to a different email address",
    });
  }

  // Resolve item from owner's state
  const ownerState = await prisma.cryoSearchState.findUnique({
    where: { userId: invite.ownerId },
  });

  const labs = (ownerState?.labs as unknown as LabModel[]) ?? [];
  const resolved = resolveItem(labs, invite.itemId);

  if (!resolved) {
    throw new HTTPException(404, {
      message: "The shared item no longer exists in the owner's repository",
    });
  }

  // Build AllowedUsersModel entry
  const newEntry: AllowedUsersModel = {
    userId: inviteeUser.id,
    userName: inviteeUser.name || inviteeUser.email,
    userImage: inviteeUser.avatarUrl || "",
    allowedItem: invite.itemId,
    allowedItemType: resolved.itemType,
    allowedItemName: resolved.itemPath,
  };

  const currentAllowed = ((ownerState?.allowedUsers as unknown as AllowedUsersModel[]) ?? []);

  // Skip if already granted (idempotent)
  const alreadyGranted = currentAllowed.some(
    (u) => u.userId === inviteeUser.id && u.allowedItem === invite.itemId
  );

  if (!alreadyGranted) {
    const updatedAllowed = [...currentAllowed, newEntry];
    await prisma.cryoSearchState.upsert({
      where: { userId: invite.ownerId },
      create: {
        userId: invite.ownerId,
        labs: ownerState?.labs ?? [],
        activities: ownerState?.activities ?? [],
        receivedRequests: ownerState?.receivedRequests ?? [],
        sentRequests: ownerState?.sentRequests ?? [],
        allowedUsers: updatedAllowed as unknown as object[],
      },
      update: {
        allowedUsers: updatedAllowed as unknown as object[],
      },
    });
  }

  // Mark invite as used
  await prisma.cryoInvite.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return c.json({
    success: true,
    itemType: resolved.itemType,
    itemPath: resolved.itemPath,
  });
});

// ─────────────────────────────────────────────
// Public router (no auth) — GET invite preview
// Mounted separately in index.ts
// ─────────────────────────────────────────────

export const cryoSearchPublicRoutes = new Hono();

cryoSearchPublicRoutes.get("/invite/:token", async (c) => {
  const token = c.req.param("token");

  const invite = await prisma.cryoInvite.findUnique({
    where: { token },
    include: {
      owner: { select: { name: true, email: true } },
    },
  });

  if (!invite) {
    throw new HTTPException(404, { message: "Invite not found or invalid" });
  }

  const expired = invite.expiresAt < new Date();
  const used = invite.usedAt !== null;

  // Resolve item path even for expired/used invites so the UI can describe what was shared
  const ownerState = await prisma.cryoSearchState.findUnique({
    where: { userId: invite.ownerId },
  });

  const labs = (ownerState?.labs as unknown as LabModel[]) ?? [];
  const resolved = resolveItem(labs, invite.itemId);

  return c.json({
    ownerName: invite.owner.name || invite.owner.email,
    itemId: invite.itemId,
    itemType: resolved?.itemType ?? "Item",
    itemPath: resolved?.itemPath ?? [invite.itemId],
    inviteeEmail: invite.inviteeEmail,
    expired,
    used,
  });
});
