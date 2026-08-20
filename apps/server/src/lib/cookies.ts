import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getAccessExpiresInSeconds, parseDurationToMs } from "./jwt.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

function cookieBase() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax" as const,
  };
}

export function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string
) {
  const refreshMaxAge = Math.floor(
    parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN || "7d") / 1000
  );

  setCookie(c, ACCESS_COOKIE, accessToken, {
    ...cookieBase(),
    maxAge: getAccessExpiresInSeconds(),
  });
  setCookie(c, REFRESH_COOKIE, refreshToken, {
    ...cookieBase(),
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS_COOKIE, { path: "/" });
  deleteCookie(c, REFRESH_COOKIE, { path: "/" });
}

export function getAccessTokenFromRequest(c: Context) {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }

  return getCookie(c, ACCESS_COOKIE) || null;
}

export function getRefreshTokenFromRequest(c: Context, bodyToken?: string) {
  return bodyToken?.trim() || getCookie(c, REFRESH_COOKIE) || null;
}
