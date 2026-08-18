import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { prisma } from "./lib/prisma.js";

const app = new Hono();
const port = Number(process.env.PORT) || 3000;

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

console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
