import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma.js";
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "./cloudinary.js";
import { getRazorpayKeyId, isRazorpayConfigured } from "./razorpay.js";

export type LmsMasterTab = {
  id: string;
  label: string;
  headline: string;
  description: string;
  highlights: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

export const DEFAULT_LMS_MASTER_TABS: LmsMasterTab[] = [
  {
    id: "overview",
    label: "Overview",
    headline:
      "Lab Management Suite central dashboard & unified laboratory workflows",
    description:
      "CellsInVitro LMS Suite brings critical laboratory operations into one cohesive digital workspace. Manage cryovials in CryoSearch, track reagent inventory in Stock Management, oversee grant allocations in Budget Management, and document experiments in Lab Logbook.",
    highlights: [
      "End-to-end traceability from freezer dewar to bench experiment",
      "Role-based team collaboration with secure invite links",
      "Flexible modular licensing — unlock individual modules or the full suite",
    ],
    ctaLabel: "Explore Modules",
    ctaHref: "#lms-modules",
  },
  {
    id: "cryosearch",
    label: "CryoSearch",
    headline:
      "2D visual rack & box layout, cryovial inventory, and dewar tracking",
    description:
      "Organize laboratories, liquid nitrogen dewars, racks, and cryoboxes in an interactive 2D grid. Assign cell-line color codes, search across all vials or locate vacant slots instantly, and collaborate with shared repository access.",
    highlights: [
      "Interactive 2D box & cryovial coordinate grid",
      "Cell-line color coding & instant vacant slot search",
      "Shared lab repositories & collaborator permission controls",
    ],
  },
  {
    id: "stock",
    label: "Stock Management",
    headline:
      "Track reagents, chemicals, consumables, low-stock alerts & transactions",
    description:
      "Maintain accurate visibility across lab supplies and chemical inventory. Configure minimum stock thresholds, log item issues and restocks, and audit stock activity across your laboratory workspace.",
    highlights: [
      "Real-time reagent, chemical & consumable inventory",
      "Automated low-stock deficit alerts before supplies run out",
      "Complete stock issue & transaction audit history",
    ],
  },
  {
    id: "budget",
    label: "Budget Management",
    headline:
      "Budget heads, expense submissions & research grant allocations",
    description:
      "Plan and monitor laboratory finances across grants and project heads. Submit expense requests, track real-time utilization against allocated funds, and keep principal investigators informed.",
    highlights: [
      "Custom grant & departmental budget heads",
      "Structured expense submission & approval workflows",
      "Real-time budget utilization & remaining balance tracking",
    ],
  },
  {
    id: "logbook",
    label: "Lab Logbook",
    headline:
      "Electronic lab notebook, protocols, instrument bookings & experiment logs",
    description:
      "Replace paper binders with a structured electronic lab notebook (ELN). Record daily protocols and observations with image attachments, book shared instruments, manage team tasks, and track lab attendance.",
    highlights: [
      "Electronic lab notebook with revision & activity logs",
      "Shared instrument booking calendar & usage tracking",
      "Team attendance & assigned lab task management",
    ],
  },
  {
    id: "access",
    label: "Access Requests",
    headline:
      "Manage repository sharing, collaborator invites & module access",
    description:
      "Send email invites, review incoming repository requests, and control module-level collaborator permissions.",
    highlights: [
      "Email-based collaborator invitations",
      "Granular module-level permissions",
      "Included free for all registered lab accounts",
    ],
  },
];

export function normalizeMasterTabs(raw: unknown): LmsMasterTab[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_LMS_MASTER_TABS;
  }

  const normalized: LmsMasterTab[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label) continue;

    const idRaw = typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tab-${i + 1}`;

    const highlights = Array.isArray(record.highlights)
      ? record.highlights
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.trim())
          .filter(Boolean)
      : [];

    normalized.push({
      id: idRaw,
      label,
      headline: typeof record.headline === "string" ? record.headline.trim() : "",
      description: typeof record.description === "string" ? record.description.trim() : "",
      highlights,
      ctaLabel: typeof record.ctaLabel === "string" ? record.ctaLabel.trim() : undefined,
      ctaHref: typeof record.ctaHref === "string" ? record.ctaHref.trim() : undefined,
    });
  }

  return normalized.length > 0 ? normalized : DEFAULT_LMS_MASTER_TABS;
}

let ensuredColumnsPromise: Promise<void> | null = null;

async function ensureLmsMasterColumns() {
  if (!ensuredColumnsPromise) {
    ensuredColumnsPromise = prisma
      .$executeRawUnsafe(
        `ALTER TABLE IF EXISTS "LmsSetting"
          ADD COLUMN IF NOT EXISTS "bannerImageUrl" TEXT,
          ADD COLUMN IF NOT EXISTS "bannerTitle" TEXT NOT NULL DEFAULT 'Lab Management Suite (LMS)',
          ADD COLUMN IF NOT EXISTS "bannerSubtitle" TEXT NOT NULL DEFAULT 'Integrated software solutions to manage cryostorage, lab inventory, electronic logbooks, and research budgets.',
          ADD COLUMN IF NOT EXISTS "bannerBadge" TEXT NOT NULL DEFAULT 'Lab Management Suite',
          ADD COLUMN IF NOT EXISTS "bannerCtaLabel" TEXT NOT NULL DEFAULT 'Contact us',
          ADD COLUMN IF NOT EXISTS "bannerCtaHref" TEXT NOT NULL DEFAULT '/contact',
          ADD COLUMN IF NOT EXISTS "bannerSecondaryLabel" TEXT NOT NULL DEFAULT 'Speak to an expert',
          ADD COLUMN IF NOT EXISTS "bannerSecondaryHref" TEXT NOT NULL DEFAULT '/contact',
          ADD COLUMN IF NOT EXISTS "masterTabs" JSONB;`
      )
      .then(() => undefined)
      .catch((err) => {
        ensuredColumnsPromise = null;
        throw err;
      });
  }
  await ensuredColumnsPromise;
}

export async function getOrCreateLmsSettings() {
  await ensureLmsMasterColumns();
  let settings = await prisma.lmsSetting.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.lmsSetting.create({
      data: {
        id: "default",
        repoPrice: 149900,
        stockPrice: 149900,
        budgetPrice: 149900,
        logbookPrice: 199900,
        twoSectionDiscountPct: 15,
        threeSectionDiscountPct: 25,
        fullAccessPrice: 399900,
        currency: "INR",
        masterTabs: DEFAULT_LMS_MASTER_TABS,
      },
    });
  }
  return settings;
}

export function serializeLmsSettings(
  settings: Awaited<ReturnType<typeof getOrCreateLmsSettings>>,
  includePaymentMeta = false
) {
  const base = {
    repoPrice: settings.repoPrice,
    stockPrice: settings.stockPrice,
    budgetPrice: settings.budgetPrice,
    logbookPrice: settings.logbookPrice,
    twoSectionDiscountPct: settings.twoSectionDiscountPct,
    threeSectionDiscountPct: settings.threeSectionDiscountPct,
    fullAccessPrice: settings.fullAccessPrice,
    currency: settings.currency,
    bannerImageUrl: settings.bannerImageUrl ?? null,
    bannerTitle: settings.bannerTitle,
    bannerSubtitle: settings.bannerSubtitle,
    bannerBadge: settings.bannerBadge,
    bannerCtaLabel: settings.bannerCtaLabel,
    bannerCtaHref: settings.bannerCtaHref,
    bannerSecondaryLabel: settings.bannerSecondaryLabel,
    bannerSecondaryHref: settings.bannerSecondaryHref,
    masterTabs: normalizeMasterTabs(settings.masterTabs),
  };

  if (!includePaymentMeta) {
    return base;
  }

  return {
    ...base,
    razorpayKeyId: getRazorpayKeyId(),
    isRazorpayConfigured: isRazorpayConfigured(),
  };
}

export type UpdateLmsSettingsInput = {
  repoPrice?: number;
  stockPrice?: number;
  budgetPrice?: number;
  logbookPrice?: number;
  twoSectionDiscountPct?: number;
  threeSectionDiscountPct?: number;
  fullAccessPrice?: number;
  currency?: string;
  bannerImageUrl?: string | null;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerBadge?: string;
  bannerCtaLabel?: string;
  bannerCtaHref?: string;
  bannerSecondaryLabel?: string;
  bannerSecondaryHref?: string;
  masterTabs?: LmsMasterTab[];
};

export function buildLmsSettingsUpdate(body: UpdateLmsSettingsInput) {
  return {
    ...(typeof body.repoPrice === "number" && {
      repoPrice: Math.max(0, Math.round(body.repoPrice)),
    }),
    ...(typeof body.stockPrice === "number" && {
      stockPrice: Math.max(0, Math.round(body.stockPrice)),
    }),
    ...(typeof body.budgetPrice === "number" && {
      budgetPrice: Math.max(0, Math.round(body.budgetPrice)),
    }),
    ...(typeof body.logbookPrice === "number" && {
      logbookPrice: Math.max(0, Math.round(body.logbookPrice)),
    }),
    ...(typeof body.twoSectionDiscountPct === "number" && {
      twoSectionDiscountPct: Math.max(0, Math.min(100, Math.round(body.twoSectionDiscountPct))),
    }),
    ...(typeof body.threeSectionDiscountPct === "number" && {
      threeSectionDiscountPct: Math.max(0, Math.min(100, Math.round(body.threeSectionDiscountPct))),
    }),
    ...(typeof body.fullAccessPrice === "number" && {
      fullAccessPrice: Math.max(0, Math.round(body.fullAccessPrice)),
    }),
    ...(typeof body.currency === "string" && body.currency.trim() && {
      currency: body.currency.trim().toUpperCase(),
    }),
    ...(body.bannerImageUrl !== undefined && {
      bannerImageUrl:
        typeof body.bannerImageUrl === "string" && body.bannerImageUrl.trim()
          ? body.bannerImageUrl.trim()
          : null,
    }),
    ...(typeof body.bannerTitle === "string" && body.bannerTitle.trim() && {
      bannerTitle: body.bannerTitle.trim(),
    }),
    ...(typeof body.bannerSubtitle === "string" && {
      bannerSubtitle: body.bannerSubtitle.trim(),
    }),
    ...(typeof body.bannerBadge === "string" && {
      bannerBadge: body.bannerBadge.trim(),
    }),
    ...(typeof body.bannerCtaLabel === "string" && {
      bannerCtaLabel: body.bannerCtaLabel.trim(),
    }),
    ...(typeof body.bannerCtaHref === "string" && {
      bannerCtaHref: body.bannerCtaHref.trim(),
    }),
    ...(typeof body.bannerSecondaryLabel === "string" && {
      bannerSecondaryLabel: body.bannerSecondaryLabel.trim(),
    }),
    ...(typeof body.bannerSecondaryHref === "string" && {
      bannerSecondaryHref: body.bannerSecondaryHref.trim(),
    }),
    ...(body.masterTabs !== undefined && {
      masterTabs: normalizeMasterTabs(body.masterTabs),
    }),
  };
}

// ─── Banner Image Upload Helpers (Cloudinary + Local Fallback) ────────────────

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const BANNER_UPLOAD_DIR = path.join(serverRoot, "uploads", "lms-banner");
const LOCAL_BANNER_PREFIX = "/api/lms/banner-image/";

export const ALLOWED_BANNER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function extForMime(fileName: string, mimeType: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext) return ext;
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".png";
  }
}

export async function storeLmsBannerImage(
  fileName: string,
  mimeType: string,
  data: Buffer
): Promise<string> {
  if (isCloudinaryConfigured()) {
    const uploadResult = await uploadImageToCloudinary(data, {
      folder: "cellsinvitro/lms-banner",
    });
    return uploadResult.secure_url;
  }

  await mkdir(BANNER_UPLOAD_DIR, { recursive: true });
  const safeFile = `${randomUUID()}${extForMime(fileName, mimeType)}`;
  await writeFile(path.join(BANNER_UPLOAD_DIR, safeFile), data);
  return `${LOCAL_BANNER_PREFIX}${safeFile}`;
}

export async function readLocalLmsBannerImage(filename: string) {
  const safeName = path.basename(filename);
  const filePath = path.join(BANNER_UPLOAD_DIR, safeName);
  const data = await readFile(filePath);
  const ext = path.extname(safeName).toLowerCase();
  const contentType =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
      ? "image/webp"
      : ext === ".gif"
      ? "image/gif"
      : ext === ".svg"
      ? "image/svg+xml"
      : "image/png";
  return { data, contentType };
}

export async function deleteLocalBannerIfNeeded(url: string | null | undefined) {
  if (!url || !url.startsWith(LOCAL_BANNER_PREFIX)) return;
  const safeName = path.basename(url.slice(LOCAL_BANNER_PREFIX.length));
  try {
    await unlink(path.join(BANNER_UPLOAD_DIR, safeName));
  } catch {
    // Ignore missing file during cleanup
  }
}
