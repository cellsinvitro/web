import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { getAccessTokenFromRequest } from "../lib/cookies.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";

export type AuthVariables = {
  user: AccessTokenPayload;
};

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const token = getAccessTokenFromRequest(c);
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    try {
      const user = await verifyAccessToken(token);
      c.set("user", user);
      await next();
    } catch {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
  }
);
