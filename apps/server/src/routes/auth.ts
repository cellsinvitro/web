import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Designation } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { hashToken, verifyRefreshToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from "../lib/cookies.js";
import { issueTokenPair } from "../lib/session.js";
import { publicUserSelect, toPublicUser, isValidDesignation } from "../lib/user.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { googleAuthRoutes } from "./google.js";

type RegisterBody = {
  email?: string;
  password?: string;
  name?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email?: string, password?: string) {
  if (!email || !password) {
    throw new HTTPException(400, { message: "Email and password are required" });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new HTTPException(400, { message: "Invalid email address" });
  }

  if (password.length < 8) {
    throw new HTTPException(400, {
      message: "Password must be at least 8 characters",
    });
  }

  return { email: normalizedEmail, password };
}

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

authRoutes.route("/google", googleAuthRoutes);

authRoutes.post("/register", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as RegisterBody;
  const { email, password } = validateCredentials(body.email, body.password);
  const name = body.name?.trim() || null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HTTPException(409, { message: "Email is already registered" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const tokens = await issueTokenPair(user);
  setAuthCookies(c, tokens.accessToken, tokens.refreshToken);
  return c.json(
    { user: tokens.user, expiresIn: tokens.expiresIn, accessToken: tokens.accessToken },
    201
  );
});

authRoutes.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as LoginBody;
  const { email, password } = validateCredentials(body.email, body.password);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  if (!user.passwordHash) {
    throw new HTTPException(401, {
      message: "This account uses Google sign-in",
    });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const tokens = await issueTokenPair(user);
  setAuthCookies(c, tokens.accessToken, tokens.refreshToken);
  return c.json({ user: tokens.user, expiresIn: tokens.expiresIn, accessToken: tokens.accessToken });
});

authRoutes.post("/refresh", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as RefreshBody;
  const refreshToken = getRefreshTokenFromRequest(c, body.refreshToken);

  if (!refreshToken) {
    throw new HTTPException(400, { message: "Refresh token is required" });
  }

  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired refresh token" });
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !stored ||
    stored.userId !== payload.sub ||
    stored.expiresAt.getTime() <= Date.now()
  ) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new HTTPException(401, { message: "Invalid or expired refresh token" });
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await issueTokenPair(stored.user);
  setAuthCookies(c, tokens.accessToken, tokens.refreshToken);
  return c.json({ user: tokens.user, expiresIn: tokens.expiresIn, accessToken: tokens.accessToken });
});

authRoutes.post("/logout", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as RefreshBody;
  const refreshToken = getRefreshTokenFromRequest(c, body.refreshToken);

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(refreshToken) },
    });
  }

  clearAuthCookies(c);
  return c.json({ success: true });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const authUser = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: publicUserSelect,
  });

  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return c.json({ user: toPublicUser(user) });
});

type UpdateProfileBody = {
  name?: string;
  designation?: string | null;
};

authRoutes.patch("/me", requireAuth, async (c) => {
  const authUser = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as UpdateProfileBody;

  const data: { name?: string | null; designation?: Designation | null } = {};

  if (body.name !== undefined) {
    data.name = body.name?.trim() || null;
  }

  if (body.designation !== undefined) {
    if (body.designation === null || body.designation === "") {
      data.designation = null;
    } else if (!isValidDesignation(body.designation)) {
      throw new HTTPException(400, { message: "Invalid designation" });
    } else {
      data.designation = body.designation;
    }
  }

  const user = await prisma.user.update({
    where: { id: authUser.sub },
    data,
    select: publicUserSelect,
  });

  return c.json({ user: toPublicUser(user) });
});
