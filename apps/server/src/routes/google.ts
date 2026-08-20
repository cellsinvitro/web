import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "../lib/prisma.js";
import { setAuthCookies } from "../lib/cookies.js";
import { issueTokenPair } from "../lib/session.js";

const STATE_COOKIE = "oauth_state";
const STATE_MAX_AGE = 60 * 10;

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function frontendOrigin() {
  return (process.env.FRONTEND_ORIGIN || "http://localhost:3001").replace(
    /\/$/,
    ""
  );
}

function googleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${frontendOrigin()}/api/auth/google/callback`
  );
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HTTPException(503, {
      message: "Google sign-in is not configured",
    });
  }

  return {
    clientId,
    clientSecret,
    redirectUri: googleRedirectUri(),
  };
}

function redirectToLogin(error: string) {
  return `${frontendOrigin()}/login?error=${encodeURIComponent(error)}`;
}

function cookieBase() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax" as const,
  };
}

export const googleAuthRoutes = new Hono();

googleAuthRoutes.get("/", (c) => {
  let clientId: string;
  let redirectUri: string;
  try {
    ({ clientId, redirectUri } = googleConfig());
  } catch {
    return c.redirect(redirectToLogin("google_config"));
  }
  const state = randomBytes(32).toString("base64url");

  setCookie(c, STATE_COOKIE, state, {
    ...cookieBase(),
    maxAge: STATE_MAX_AGE,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return c.redirect(url.toString());
});

googleAuthRoutes.get("/callback", async (c) => {
  const errorParam = c.req.query("error");
  if (errorParam) {
    return c.redirect(redirectToLogin("google_denied"));
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = getCookie(c, STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return c.redirect(redirectToLogin("google"));
  }

  setCookie(c, STATE_COOKIE, "", {
    ...cookieBase(),
    maxAge: 0,
  });

  try {
    const { clientId, clientSecret, redirectUri } = googleConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      return c.redirect(redirectToLogin("google"));
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const profile = (await profileResponse.json()) as GoogleUserInfo;

    if (
      !profileResponse.ok ||
      !profile.sub ||
      !profile.email ||
      profile.email_verified === false
    ) {
      return c.redirect(redirectToLogin("google_email"));
    }

    const email = profile.email.trim().toLowerCase();
    const name = profile.name?.trim() || null;
    const avatarUrl = profile.picture?.trim() || null;

    let user = await prisma.user.findUnique({
      where: { googleId: profile.sub },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatarUrl: avatarUrl || user.avatarUrl,
        },
      });
    } else {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: profile.sub,
            name: existing.name || name,
            avatarUrl: avatarUrl || existing.avatarUrl,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId: profile.sub,
            avatarUrl,
          },
        });
      }
    }

    const tokens = await issueTokenPair(user);
    setAuthCookies(c, tokens.accessToken, tokens.refreshToken);
    return c.redirect(`${frontendOrigin()}/`);
  } catch {
    return c.redirect(redirectToLogin("google"));
  }
});
