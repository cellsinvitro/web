import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import { isAdminUser } from "../lib/admin.js";
import type { AuthVariables } from "./auth.js";

export const requireAdmin = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authUser = c.get("user");
    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user || !isAdminUser(user)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  }
);
