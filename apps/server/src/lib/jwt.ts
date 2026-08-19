import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  return new TextEncoder().encode(requireEnv(name));
}

function getAccessExpiresIn() {
  return process.env.JWT_ACCESS_EXPIRES_IN || "15m";
}

function getRefreshExpiresIn() {
  return process.env.JWT_REFRESH_EXPIRES_IN || "7d";
}

/** Parse durations like 15m, 7d, 3600 into milliseconds. */
export function parseDurationToMs(value: string) {
  const trimmed = value.trim();
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${value}`);
  }
}

export function getAccessExpiresInSeconds() {
  return Math.floor(parseDurationToMs(getAccessExpiresIn()) / 1000);
}

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(getAccessExpiresIn())
    .sign(getSecret("JWT_ACCESS_SECRET"));
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret("JWT_ACCESS_SECRET"));
  const sub = payload.sub;
  const email = payload.email;

  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid access token payload");
  }

  return { sub, email } satisfies AccessTokenPayload;
}

export async function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const expiresIn = getRefreshExpiresIn();
  const expiresAt = new Date(Date.now() + parseDurationToMs(expiresIn));

  const token = await new SignJWT({ typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret("JWT_REFRESH_SECRET"));

  return { token, jti, expiresAt };
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
  const sub = payload.sub;
  const jti = payload.jti;

  if (typeof sub !== "string" || typeof jti !== "string") {
    throw new Error("Invalid refresh token payload");
  }

  return { sub, jti } satisfies RefreshTokenPayload;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
