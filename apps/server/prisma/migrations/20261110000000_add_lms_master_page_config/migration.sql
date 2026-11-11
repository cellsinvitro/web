-- Add backend-editable banner & master tabs fields to LmsSetting
ALTER TABLE IF EXISTS "LmsSetting"
  ADD COLUMN IF NOT EXISTS "bannerImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerTitle" TEXT NOT NULL DEFAULT 'Lab Management Suite (LMS)',
  ADD COLUMN IF NOT EXISTS "bannerSubtitle" TEXT NOT NULL DEFAULT 'Integrated software solutions to manage cryostorage, lab inventory, electronic logbooks, and research budgets.',
  ADD COLUMN IF NOT EXISTS "bannerBadge" TEXT NOT NULL DEFAULT 'Lab Management Suite',
  ADD COLUMN IF NOT EXISTS "bannerCtaLabel" TEXT NOT NULL DEFAULT 'Contact us',
  ADD COLUMN IF NOT EXISTS "bannerCtaHref" TEXT NOT NULL DEFAULT '/contact',
  ADD COLUMN IF NOT EXISTS "bannerSecondaryLabel" TEXT NOT NULL DEFAULT 'Speak to an expert',
  ADD COLUMN IF NOT EXISTS "bannerSecondaryHref" TEXT NOT NULL DEFAULT '/contact',
  ADD COLUMN IF NOT EXISTS "masterTabs" JSONB;
