-- CreateTable
CREATE TABLE "ResearchKit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageStorageKey" TEXT,
    "assays" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchKit_pkey" PRIMARY KEY ("id")
);

-- Seed default kits
INSERT INTO "ResearchKit" (
    "id",
    "title",
    "category",
    "imageStorageKey",
    "assays",
    "published",
    "sortOrder",
    "createdAt",
    "updatedAt"
) VALUES
(
    'seed_anti_cancer',
    'Anti-Cancer Assay Kits',
    'Anti-Cancer',
    '/images/kits/anti-cancer.png',
    ARRAY['SRB Assay Kit', 'MTT Assay Kit'],
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'seed_anti_oxidant',
    'Anti-Oxidant Assay Kits',
    'Anti-Oxidant',
    '/images/kits/anti-oxidant.png',
    ARRAY['H2O2 Scavenging Assay Kit', 'Reducing Power Assay Kit'],
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'seed_anti_diabetic',
    'Anti-Diabetic Assay Kits',
    'Anti-Diabetic',
    '/images/kits/anti-diabetic.png',
    ARRAY['Alpha-Amylase Inhibition Kit', 'Alpha-Glucosidase Assay Kit'],
    true,
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
