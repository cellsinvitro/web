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
import { adminKitModulesRoutes } from "./routes/admin-kit-modules.js";
import { kitsRoutes } from "./routes/kits.js";
import { adminCoursesRoutes } from "./routes/admin-courses.js";
import { adminConsultancyRoutes } from "./routes/admin-consultancy.js";
import { coursesRoutes, certificateRoutes } from "./routes/courses.js";
import { consultancyRoutes } from "./routes/consultancy.js";
import { paymentsRoutes } from "./routes/payments.js";
import { cryoSearchRoutes, cryoSearchPublicRoutes } from "./routes/cryosearch.js";
import { liveClassesRoutes, liveClassWebhookRoutes } from "./routes/live-classes.js";
import { toolsRoutes } from "./routes/tools.js";
import { adminOrdersRoutes } from "./routes/admin-orders.js";
import { adminMaintenanceRoutes, maintenanceRoutes } from "./routes/maintenance.js";
import { maintenanceMiddleware } from "./middleware/maintenance.js";
import { budgetRoutes } from "./routes/budget.js";
import { logbookRoutes } from "./routes/logbook.js";
import { stockRoutes } from "./routes/stock.js";
import { lmsRoutes } from "./routes/lms.js";
import { adminLmsRoutes } from "./routes/admin-lms.js";

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

app.use("*", maintenanceMiddleware);

app.route("/auth", authRoutes);
app.route("/admin/materials", adminMaterialsRoutes);
app.route("/admin/kits", adminKitsRoutes);
app.route("/admin/kit-modules", adminKitModulesRoutes);
app.route("/admin/lms", adminLmsRoutes);
app.route("/admin", adminCoursesRoutes);
app.route("/admin", adminConsultancyRoutes);
app.route("/admin", adminOrdersRoutes);
app.route("/admin", adminRoutes);
app.route("/admin/maintenance", adminMaintenanceRoutes);
app.route("/maintenance", maintenanceRoutes);
app.route("/materials", materialsRoutes);
app.route("/kits", kitsRoutes);
app.route("/courses", coursesRoutes);
app.route("/consultancy", consultancyRoutes);
app.route("/payments", paymentsRoutes);
app.route("/certificates", certificateRoutes);
app.route("/cryosearch", cryoSearchPublicRoutes);
app.route("/cryosearch", cryoSearchRoutes);
app.route("/live-classes", liveClassesRoutes);
app.route("/tools", toolsRoutes);
app.route("/webhooks", liveClassWebhookRoutes);
app.route("/budgets", budgetRoutes);
app.route("/logbook", logbookRoutes);
app.route("/stock", stockRoutes);
app.route("/lms", lmsRoutes);




// ── Temporary email diagnostic endpoint ──────────────────────────────────────
// Hit: POST http://localhost:3000/debug/test-email  body: { "to": "you@example.com" }
// Remove this route once email delivery is confirmed working.
app.post("/debug/test-email", async (c) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
  const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "CellsInVitro <cellsinvitro.w@gmail.com>";

  const body = await c.req.json().catch(() => null) as { to?: string } | null;
  const to = body?.to;
  if (!to) return c.json({ error: "Provide { to: 'email@example.com' } in the body" }, 400);

  if (!BREVO_API_KEY) return c.json({ error: "BREVO_API_KEY is not set in .env" }, 500);

  const keyType = BREVO_API_KEY.startsWith("xkeysib-")
    ? "✅ REST API key (correct)"
    : BREVO_API_KEY.startsWith("xsmtpsib-")
    ? "❌ SMTP credential — this will NOT work with Brevo REST API. Go to app.brevo.com → SMTP & API → API Keys and generate an 'xkeysib-' key."
    : "⚠️ Unknown key format";

  const parseSender = (from: string) => {
    const match = /^(.+?)\s*<([^>]+)>$/.exec(from.trim());
    if (match?.[1] && match[2]) return { name: match[1].trim(), email: match[2].trim() };
    return { name: "CellsInVitro", email: from.trim() };
  };

  const sender = parseSender(EMAIL_FROM);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject: "CellsInVitro — Email delivery test",
      htmlContent: "<p>If you received this, Brevo email delivery is working correctly.</p>",
    }),
  });

  const responseText = await response.text();
  let responseJson: unknown = null;
  try { responseJson = JSON.parse(responseText); } catch { responseJson = responseText; }

  return c.json({
    keyType,
    senderParsed: sender,
    httpStatus: response.status,
    brevoResponse: responseJson,
    delivered: response.ok,
    fix: response.ok ? null : response.status === 401
      ? "Replace BREVO_API_KEY with an 'xkeysib-' key from app.brevo.com → SMTP & API → API Keys"
      : response.status === 400
      ? `Sender ${sender.email} is not verified in Brevo. Go to app.brevo.com → Senders & IP → Senders and add it.`
      : "Check brevoResponse above for details",
  });
});
// ─────────────────────────────────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
