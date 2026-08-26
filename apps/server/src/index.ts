import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { materialsRoutes } from "./routes/materials.js";
import { adminMaterialsRoutes } from "./routes/admin-materials.js";
import { adminKitsRoutes } from "./routes/admin-kits.js";
import { kitsRoutes } from "./routes/kits.js";

const app = new Hono();
const port = Number(process.env.PORT) || 3000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3001";

app.use(
  "*",
  cors({
    origin: frontendOrigin,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/", (c) => c.json({ status: "ok" }));

app.get("/health/db", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 503);
  }
});

app.route("/auth", authRoutes);
app.route("/admin/materials", adminMaterialsRoutes);
app.route("/admin/kits", adminKitsRoutes);
app.route("/admin", adminRoutes);
app.route("/materials", materialsRoutes);
app.route("/kits", kitsRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
