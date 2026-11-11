"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchLmsSettings,
  fetchLmsUserAccess,
  type LmsMasterTab,
  type LmsSettings,
  type LmsUserAccess,
} from "@/lib/api";
import CryoSearchApp, { type CryoWorkspaceTab } from "./CryoSearchApp";
import LmsPurchaseModal from "./LmsPurchaseModal";

const ACCESS_TAB_FALLBACK: LmsMasterTab = {
  id: "access",
  label: "Access Requests",
  headline: "Manage repository sharing, collaborator invites & module access",
  description:
    "Send email invites, review incoming repository requests, and control module-level collaborator permissions.",
  highlights: [
    "Email-based collaborator invitations",
    "Granular module-level permissions",
    "Included free for all registered lab accounts",
  ],
};

const FALLBACK_TABS: LmsMasterTab[] = [
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
  ACCESS_TAB_FALLBACK,
];

function toWorkspaceTab(tabId: string): CryoWorkspaceTab | null {
  const normalized = tabId.trim().toLowerCase();
  if (normalized === "cryosearch" || normalized === "repo") return "repo";
  if (normalized === "stock") return "stock";
  if (normalized === "budget") return "budget";
  if (normalized === "logbook") return "logbook";
  if (normalized === "access") return "access";
  return null;
}

function parseLegacyTabHref(href?: string): CryoWorkspaceTab | null {
  if (!href) return null;
  const match = href.match(/^\/LMS\?tab=([a-zA-Z0-9_-]+)$/);
  if (!match) return null;
  return toWorkspaceTab(match[1]!);
}

const WORKSPACE_SECTION_KEY: Record<
  CryoWorkspaceTab,
  "lms_repo" | "lms_stock" | "lms_budget" | "lms_logbook" | "lms_access"
> = {
  repo: "lms_repo",
  stock: "lms_stock",
  budget: "lms_budget",
  logbook: "lms_logbook",
  access: "lms_access",
};

type ModuleBoxDef = {
  key: "lms_repo" | "lms_stock" | "lms_budget" | "lms_logbook" | "lms_access";
  tab: "repo" | "stock" | "budget" | "logbook" | "access";
  title: string;
  badge: string;
  description: string;
  features: string[];
  priceField?: "repoPrice" | "stockPrice" | "budgetPrice" | "logbookPrice";
  isFree?: boolean;
  icon: React.ReactNode;
};

const MODULE_BOXES: ModuleBoxDef[] = [
  {
    key: "lms_repo",
    tab: "repo",
    title: "CryoSearch",
    badge: "Cell Banking",
    priceField: "repoPrice",
    description:
      "Visual 2D rack, box, and cryovial repository with dewar tracking, cell-line color coding, and instant slot search.",
    features: [
      "Interactive 2D box & vial coordinate grid",
      "Cell-line color mapping & vacant slot finder",
      "Shared lab repositories & collaborator invites",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      </svg>
    ),
  },
  {
    key: "lms_stock",
    tab: "stock",
    title: "Stock Management",
    badge: "Lab Supplies",
    priceField: "stockPrice",
    description:
      "Track reagents, chemicals, and consumables with low-stock threshold alerts, issue workflows, and audit logs.",
    features: [
      "Real-time reagent & consumable inventory",
      "Automated low-stock deficit notifications",
      "Issue tracking & lab supply history",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    key: "lms_logbook",
    tab: "logbook",
    title: "Lab Logbook",
    badge: "ELN & Protocols",
    priceField: "logbookPrice",
    description:
      "Electronic lab notebook for experiment records, instrument bookings, attendance tracking, and team tasks.",
    features: [
      "Rich electronic lab notebook with revision history",
      "Instrument booking calendar & equipment logs",
      "Team attendance & task assignments",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    key: "lms_budget",
    tab: "budget",
    title: "Budget Management",
    badge: "Finance & Grants",
    priceField: "budgetPrice",
    description:
      "Organize research grant allocations, custom budget heads, purchase submissions, and utilization summaries.",
    features: [
      "Grant & departmental budget head tracking",
      "Expense submission & approval workflow",
      "Real-time spend vs. allocation visibility",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-8.25 0H6m1.5 0H6" />
      </svg>
    ),
  },
  {
    key: "lms_access",
    tab: "access",
    title: "Access & Collaboration",
    badge: "Team Sharing",
    isFree: true,
    description:
      "Manage laboratory team permissions, review incoming repository requests, and control module-level access rights.",
    features: [
      "Email-based collaborator invitations",
      "Granular module-level permissions",
      "Included free for all registered lab accounts",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
];

function formatPrice(paise?: number, currency = "INR") {
  if (typeof paise !== "number") return "";
  const amount = Math.round(paise / 100);
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export default function LmsMasterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<LmsSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [userAccess, setUserAccess] = useState<LmsUserAccess | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("overview");

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTargetSection, setPurchaseTargetSection] = useState<string | undefined>(undefined);

  const tabs = useMemo(() => {
    const base = settings?.masterTabs?.length ? settings.masterTabs : FALLBACK_TABS;
    const hasAccessTab = base.some((t) => toWorkspaceTab(t.id) === "access");
    return hasAccessTab ? base : [...base, ACCESS_TAB_FALLBACK];
  }, [settings]);

  const resolveTabId = useCallback(
    (rawTab: string, availableTabs: LmsMasterTab[]): string => {
      const normalized = rawTab.trim().toLowerCase();
      const ws = toWorkspaceTab(normalized);
      if (ws) {
        const match = availableTabs.find((t) => toWorkspaceTab(t.id) === ws);
        if (match) return match.id;
      }
      const direct = availableTabs.find((t) => t.id.toLowerCase() === normalized);
      if (direct) return direct.id;
      return availableTabs[0]?.id || "overview";
    },
    []
  );

  useEffect(() => {
    let initialRequestedTab: string | null = null;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const legacyTab = url.searchParams.get("tab");
      const hasInvite = Boolean(url.searchParams.get("invite"));
      const hasInviteToken = Boolean(url.searchParams.get("inviteToken"));

      if (legacyTab) {
        initialRequestedTab = legacyTab;
        url.searchParams.delete("tab");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } else if (hasInvite) {
        initialRequestedTab = "access";
      } else if (hasInviteToken) {
        initialRequestedTab = "logbook";
      }

      const pendingTab = sessionStorage.getItem("lmsPendingTab");
      if (pendingTab) {
        sessionStorage.removeItem("lmsPendingTab");
        if (!initialRequestedTab) {
          initialRequestedTab = pendingTab;
        }
      }
    }

    let active = true;
    fetchLmsSettings()
      .then((res) => {
        if (!active) return;
        setSettings(res.settings);
        const base = res.settings.masterTabs?.length ? res.settings.masterTabs : FALLBACK_TABS;
        const resolved = base.some((t) => toWorkspaceTab(t.id) === "access")
          ? base
          : [...base, ACCESS_TAB_FALLBACK];
        setActiveTabId(
          initialRequestedTab
            ? resolveTabId(initialRequestedTab, resolved)
            : resolved[0]?.id || "overview"
        );
      })
      .catch(() => {
        if (!active) return;
        setActiveTabId(
          initialRequestedTab
            ? resolveTabId(initialRequestedTab, FALLBACK_TABS)
            : FALLBACK_TABS[0]!.id
        );
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, [resolveTabId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserAccess(null);
      return;
    }
    fetchLmsUserAccess()
      .then((res) => setUserAccess(res))
      .catch(() => setUserAccess(null));
  }, [user, authLoading]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0]!,
    [tabs, activeTabId]
  );

  const activeWorkspaceTab = useMemo(
    () => toWorkspaceTab(activeTab.id),
    [activeTab.id]
  );

  const selectTab = useCallback(
    (tabId: string, scrollToTabs = false) => {
      const ws = toWorkspaceTab(tabId);
      if (ws && ws !== "repo" && !authLoading && !user) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("lmsPendingTab", tabId);
        }
        router.push(`/login?redirect=${encodeURIComponent("/LMS")}`);
        return;
      }
      setActiveTabId(tabId);
      if (scrollToTabs && typeof document !== "undefined") {
        document.getElementById("lms-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [authLoading, user, router]
  );

  const handleOpenWorkspaceTab = useCallback(
    (wsTab: CryoWorkspaceTab, scrollToTabs = true) => {
      const targetId = resolveTabId(wsTab, tabs);
      selectTab(targetId, scrollToTabs);
    },
    [resolveTabId, tabs, selectTab]
  );

  useEffect(() => {
    const handleNavbarTabSelect = (event: Event) => {
      const custom = event as CustomEvent<{ tab?: string }>;
      const requested = custom.detail?.tab;
      if (!requested) return;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("lmsPendingTab");
      }
      const targetId = resolveTabId(requested, tabs);
      selectTab(targetId, true);
    };

    window.addEventListener("lms-select-tab", handleNavbarTabSelect);
    return () => {
      window.removeEventListener("lms-select-tab", handleNavbarTabSelect);
    };
  }, [tabs, resolveTabId, selectTab]);

  const isUnlocked = (sectionKey: string, isFree?: boolean) => {
    if (isFree) return Boolean(user);
    if (!userAccess) return false;
    return (
      userAccess.isAdmin ||
      userAccess.hasFullAccess ||
      userAccess.sections.includes(sectionKey)
    );
  };

  const handleUnlockClick = (sectionKey?: string) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/LMS")}`);
      return;
    }
    setPurchaseTargetSection(sectionKey);
    setIsPurchaseModalOpen(true);
  };

  const bannerBadge = settings?.bannerBadge || "Lab Management Suite";
  const bannerTitle = settings?.bannerTitle || "Lab Management Suite (LMS)";
  const bannerSubtitle =
    settings?.bannerSubtitle ||
    "Integrated software solutions to manage cryostorage, lab inventory, electronic logbooks, and research budgets.";
  const bannerCtaLabel = settings?.bannerCtaLabel || "Contact us";
  const bannerCtaHref = settings?.bannerCtaHref || "/contact";
  const bannerSecondaryLabel = settings?.bannerSecondaryLabel || "Speak to an expert";
  const bannerSecondaryHref = settings?.bannerSecondaryHref || "/contact";

  const hasFullPass = Boolean(userAccess?.isAdmin || userAccess?.hasFullAccess);

  return (
    <div className="min-h-screen bg-slate-50 pt-[90px] sm:pt-[94px]">
      {/* =================================================================== */}
      {/* 1. HERO BANNER (Backend-editable banner image, title, CTA)          */}
      {/* =================================================================== */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* Editable Backend Banner Image or Clean Scientific Backdrop */}
        {settings?.bannerImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.bannerImageUrl}
              alt={bannerTitle}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/35" />
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(148,163,184,0.22),transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-300">
                <Link href="/" className="hover:text-white transition-colors">
                  CellsInVitro
                </Link>
                <span aria-hidden="true" className="text-slate-500">›</span>
                <span className="font-semibold text-white">{bannerBadge}</span>
              </nav>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.12]">
                {bannerTitle}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                {bannerSubtitle}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={bannerCtaHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:bg-slate-200 sm:text-sm"
                >
                  {bannerCtaLabel}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const overviewTab = tabs.find((t) => toWorkspaceTab(t.id) === null) || tabs[0];
                    if (overviewTab) setActiveTabId(overviewTab.id);
                    setTimeout(() => {
                      document
                        .getElementById("lms-modules")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/70 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition-all hover:border-slate-400 hover:bg-slate-800 sm:text-sm"
                >
                  Explore Modules
                  <span aria-hidden="true">↓</span>
                </button>
              </div>
            </div>

            {/* Subtle Decorative Preview Card when no custom banner image is uploaded */}
            {!settings?.bannerImageUrl && (
              <div className="hidden lg:col-span-5 lg:block">
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Workspace Snapshot
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        CryoSearch
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">2D Vial Grids</div>
                      <div className="mt-2 grid grid-cols-5 gap-1">
                        {Array.from({ length: 10 }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-2.5 rounded-xs ${
                              idx % 3 === 0 ? "bg-white/80" : idx % 2 === 0 ? "bg-slate-500" : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Stock &amp; ELN
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">Live Inventory</div>
                      <div className="mt-2 space-y-1.5">
                        <div className="h-2 w-4/5 rounded bg-slate-700" />
                        <div className="h-2 w-3/5 rounded bg-slate-800" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. HORIZONTAL TABS BAR (Backend-editable tabs + right action link)   */}
      {/* =================================================================== */}
      <div id="lms-tabs" className="scroll-mt-24 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
          <div
            role="tablist"
            aria-label="LMS Suite Sections"
            className="flex items-center gap-6 overflow-x-auto scrollbar-none sm:gap-8"
          >
            {tabs.map((tab) => {
              const isSelected = activeTab.id === tab.id;
              const wsTab = toWorkspaceTab(tab.id);
              const sectionKey = wsTab ? WORKSPACE_SECTION_KEY[wsTab] : null;
              const showLock =
                Boolean(sectionKey && sectionKey !== "lms_access") &&
                userAccess !== null &&
                !isUnlocked(sectionKey!);

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => selectTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-[3px] py-4 text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    isSelected
                      ? "border-slate-950 font-bold text-slate-950"
                      : "border-transparent font-medium text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <span>{tab.label}</span>
                  {showLock && <span className="text-[11px] opacity-75">🔒</span>}
                </button>
              );
            })}
          </div>

          {bannerSecondaryLabel && (
            <Link
              href={bannerSecondaryHref}
              className="hidden shrink-0 items-center gap-2 py-3 text-xs font-semibold text-slate-800 transition-colors hover:text-slate-950 md:inline-flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-slate-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <span>{bannerSecondaryLabel}</span>
            </Link>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. ACTIVE TAB CONTENT                                               */}
      {/* =================================================================== */}
      {activeWorkspaceTab ? (
        <section className="cryosearch-theme bg-slate-50 pt-8">
          <CryoSearchApp
            embeddedTab={activeWorkspaceTab}
            onEmbeddedTabChange={(wsTab) => {
              setActiveTabId(resolveTabId(wsTab, tabs));
            }}
            hideTabBar
          />
        </section>
      ) : (
        <>
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-10 sm:py-12 lg:px-8">
              {loadingSettings ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-7 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-full max-w-3xl rounded bg-slate-100" />
                  <div className="h-4 w-5/6 max-w-2xl rounded bg-slate-100" />
                </div>
              ) : (
                <div className="space-y-6">
                  {activeTab.headline && (
                    <h2 className="max-w-4xl text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      {activeTab.headline}
                    </h2>
                  )}

                  {activeTab.description && (
                    <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base whitespace-pre-line">
                      {activeTab.description}
                    </p>
                  )}

                  {activeTab.highlights && activeTab.highlights.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                      {activeTab.highlights.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-700 sm:text-sm"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-900"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab.ctaLabel && activeTab.ctaHref && (() => {
                    const legacyWsTab = parseLegacyTabHref(activeTab.ctaHref);
                    if (legacyWsTab) {
                      return (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWorkspaceTab(legacyWsTab)}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            {activeTab.ctaLabel} →
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="pt-2">
                        {activeTab.ctaHref.startsWith("#") ? (
                          <a
                            href={activeTab.ctaHref}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            {activeTab.ctaLabel} →
                          </a>
                        ) : (
                          <Link
                            href={activeTab.ctaHref}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            {activeTab.ctaLabel} →
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* =================================================================== */}
          {/* 4. ALL LMS MODULES IN FORM OF BOXES BELOW                           */}
          {/* =================================================================== */}
          <section id="lms-modules" className="bg-slate-50/80 py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    LMS Suite Modules
                  </p>
                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Launch Your Laboratory Modules
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                    Select any module below to open its dedicated tab on this page, or combine modules with a Full LMS Pass.
                  </p>
                </div>

                {hasFullPass ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
                    ✓ Full LMS Access Active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnlockClick(undefined)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    Unlock Full LMS Pass
                    {settings?.fullAccessPrice ? (
                      <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px]">
                        {formatPrice(settings.fullAccessPrice, settings.currency)}
                      </span>
                    ) : null}
                  </button>
                )}
              </div>

              {/* Module Boxes Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {MODULE_BOXES.map((mod) => {
                  const unlocked = isUnlocked(mod.key, mod.isFree);
                  const pricePaise =
                    mod.priceField && settings ? settings[mod.priceField] : undefined;

                  return (
                    <div
                      key={mod.key}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-xs">
                            {mod.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              {mod.badge}
                            </span>
                            {mod.isFree ? (
                              <span className="text-[11px] font-bold text-emerald-700">
                                Free with account
                              </span>
                            ) : unlocked ? (
                              <span className="text-[11px] font-bold text-emerald-700">
                                ✓ Unlocked
                              </span>
                            ) : pricePaise !== undefined ? (
                              <span className="text-[11px] font-bold text-slate-700">
                                {formatPrice(pricePaise, settings?.currency)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <h3 className="mt-5 text-lg font-bold text-slate-950">
                          {mod.title}
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                          {mod.description}
                        </p>

                        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
                          {mod.features.map((feat) => (
                            <li
                              key={feat}
                              className="flex items-center gap-2 text-xs text-slate-600"
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspaceTab(mod.tab)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                        >
                          Open {mod.title}
                          <span aria-hidden="true">→</span>
                        </button>

                        {!mod.isFree && !unlocked && (
                          <button
                            type="button"
                            onClick={() => handleUnlockClick(mod.key)}
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 6th Box: Full Suite Bundle / Pricing Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-900 bg-slate-950 p-6 text-white shadow-sm">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-950">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                        </svg>
                      </div>
                      <span className="rounded-md bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                        All-In-One Bundle
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-white">
                      Full LMS Suite Pass
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                      Unlock CryoSearch, Stock Management, Lab Logbook, and Budget Management together — or save with multi-module bundles.
                    </p>

                    <ul className="mt-4 space-y-1.5 border-t border-slate-800 pt-4 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>
                          2-Module Bundle: {settings?.twoSectionDiscountPct ?? 15}% discount
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>
                          3-Module Bundle: {settings?.threeSectionDiscountPct ?? 25}% discount
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <span>
                          Full Pass:{" "}
                          {settings?.fullAccessPrice
                            ? formatPrice(settings.fullAccessPrice, settings.currency)
                            : "All 4 Modules"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    {hasFullPass ? (
                      <button
                        type="button"
                        onClick={() => handleOpenWorkspaceTab("repo")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200 transition-colors"
                      >
                        Launch Full Workspace →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlockClick(undefined)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-200 transition-colors"
                      >
                        Configure Bundle / Unlock Pass →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <LmsPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        targetSection={purchaseTargetSection}
        onSuccess={() => {
          fetchLmsUserAccess()
            .then((res) => setUserAccess(res))
            .catch(() => {});
        }}
      />
    </div>
  );
}
