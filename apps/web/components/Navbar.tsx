"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";

// Student links (Main Bottom Navbar)
const studentNavItems = [
  { label: "Courses", href: "/courses" },
  { label: "Tools", href: "/tools" },
  { label: "Resource Library", href: "/resources" },
  { label: "Research Kits", href: "/kits" },
  { label: "Contact", href: "/contact" },
];

// Faculty & LMS links (Top Navbar Bar)
const facultyNavItems = [
  {
    key: "lms_hub",
    label: "LMS Hub",
    badge: "Overview",
    description: "Lab Management Suite central dashboard & tools.",
    href: "/LMS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    key: "lms_repo",
    label: "CryoSearch",
    badge: "Cell Banking",
    description: "2D visual rack & box layout, cryovial inventory, dewar tracking.",
    href: "/LMS?tab=repo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 2-2 2v13c0 1.1.9 2 2 2Z" strokeLinejoin="round" />
      </svg>
    ),
    color: "bg-sky-50 text-sky-600",
  },
  {
    key: "lms_stock",
    label: "Stock Management",
    badge: "Lab Supplies",
    description: "Track reagents, consumables, low-stock alerts & transactions.",
    href: "/LMS?tab=stock",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "lms_budget",
    label: "Budget Management",
    badge: "Finance",
    description: "Budget heads, expense submissions & grant allocations.",
    href: "/LMS?tab=budget",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-8.25 0H6m1.5 0H6" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600",
  },
  {
    key: "lms_logbook",
    label: "Lab Logbook",
    badge: "ELN",
    description: "Electronic lab notebook, protocols & experiment logs.",
    href: "/LMS?tab=logbook",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
  },
  {
    key: "lms_admin",
    label: "Admin Portal",
    badge: "Admin",
    description: "System administration and user permission controls.",
    href: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
    ),
    color: "bg-rose-50 text-rose-600",
  },
];

const menuLinks = [
  {
    label: "Dashboard",
    description: "Your account and study materials",
    href: "/dashboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Lab Log-Book",
    description: "Instrument logs & equipment booking",
    href: "/LMS?tab=logbook",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Resource Library",
    description: "Study materials and protocols",
    href: "/resources",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M6 4h9l3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          strokeLinejoin="round"
        />
        <path d="M15 4v3h3M8 12h8M8 16h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Profile",
    description: "Account details and preferences",
    href: "/dashboard/account",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "sm",
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "mobile";
}) {
  const initials = getInitials(name, email);
  const sizeClass =
    size === "md"
      ? "h-10 w-10 text-xs"
      : size === "mobile"
        ? "h-9 w-9 text-[11px]"
        : "h-8 w-8 text-[11px]";
  const imageSize = size === "md" ? 40 : size === "mobile" ? 36 : 32;

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name || email}
        width={imageSize}
        height={imageSize}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-slate-950 font-semibold tracking-wide text-white`}
    >
      {initials}
    </span>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lmsTopMenuOpen, setLmsTopMenuOpen] = useState(false);
  const [facultyMobileOpen, setFacultyMobileOpen] = useState(false);
  const [studentMobileOpen, setStudentMobileOpen] = useState(true);
  const { user, loading, logout } = useAuth();

  const closeMenus = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setLmsTopMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenus();
    await logout();
  };

  const displayName = user?.name || user?.email || "";

  return (
    <header className="fixed left-0 top-0 z-50 w-full shadow-md">
      {/* ========================================================================= */}
      {/* TOP NAVBAR: Faculty & Lab Management Bar (Slate/Indigo Dark Strip)        */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-800/80 bg-slate-950 px-4 py-2 text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
          {/* Left Badge: Faculty Indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/20 px-2 py-0.5 font-semibold text-indigo-300 border border-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
              Faculty & LMS Portal
            </span>
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Lab Management, Cryovials, Stocks & Grants
            </span>
          </div>

          {/* Center/Right Desktop LMS Dropdown + Quick Faculty Links */}
          <div className="hidden items-center gap-3 md:flex">
            {/* LMS Dropdown Menu */}
            <div
              className="relative"
              onMouseEnter={() => setLmsTopMenuOpen(true)}
              onMouseLeave={() => setLmsTopMenuOpen(false)}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-500/20 hover:text-white"
                aria-haspopup="menu"
                aria-expanded={lmsTopMenuOpen}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 text-indigo-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25-2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                LMS Suite
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={`h-3.5 w-3.5 text-indigo-300 transition-transform duration-200 ${lmsTopMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div
                role="menu"
                className={`absolute left-0 top-full z-50 w-72 pt-2 transition-all duration-150 ${
                  lmsTopMenuOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible -translate-y-1 opacity-0"
                }`}
              >
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                  <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                      Lab Management Modules
                    </p>
                  </div>
                  <div className="p-1.5">
                    {facultyNavItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={closeMenus}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-800"
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                          {item.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="block text-xs font-semibold text-slate-100">
                              {item.label}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                              {item.badge}
                            </span>
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 p-2">
                    <Link
                      href="/LMS"
                      onClick={closeMenus}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                      Go to LMS Overview
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Direct Faculty Links */}
            <Link
              href="/admin"
              className="rounded-lg px-2.5 py-1 text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              Admin Portal
            </Link>
          </div>

          {/* Quick Right Action for Faculty */}
          <div className="flex items-center gap-3">
            <Link
              href="/LMS"
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              Open LMS
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM NAVBAR: Student Navigation & Brand Bar (Light Pristine Glass)      */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-2.5 text-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Brand Logo & Student Title */}
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={closeMenus}
          >
            <Image
              src="/images/logo.png"
              alt="CellsInVitro"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
            <div className="leading-none">
              <div className="flex items-center gap-2">
                <span className="block text-lg font-bold tracking-tight text-slate-950">
                  CellsInVitro
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 hidden sm:inline-block">
                  Student Portal
                </span>
              </div>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">
                Cell Biology Learning & Research
              </span>
            </div>
          </Link>

          {/* Desktop Student Navigation Links */}
          <div className="hidden items-center gap-7 md:flex">
            {studentNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-indigo-600"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Actions / Auth */}
          <div className="hidden items-center gap-3 md:flex">
            {!loading && user ? (
              <div
                className="relative"
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 transition-colors hover:bg-slate-100"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <UserAvatar
                    name={user.name}
                    email={user.email}
                    avatarUrl={user.avatarUrl}
                  />
                  <span className="max-w-36 truncate text-xs font-semibold text-slate-800">
                    {displayName}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Account Dropdown Menu */}
                <div
                  role="menu"
                  className={`absolute right-0 top-full z-50 w-72 pt-2 transition-all duration-150 ${userMenuOpen
                      ? "visible translate-y-0 opacity-100"
                      : "invisible -translate-y-1 opacity-0"
                    }`}
                >
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          avatarUrl={user.avatarUrl}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {user.name || "Account"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {isAdmin(user.role) ? (
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={closeMenus}
                          className="mb-1 flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path
                                d="M12 3 4 7v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7l-8-4Z"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">
                              Admin
                            </span>
                            <span className="block text-xs text-slate-500">
                              Manage users and site data
                            </span>
                          </span>
                        </Link>
                      ) : null}
                      {menuLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            {item.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">
                              {item.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-red-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15 12H3m0 0 3-3m-3 3 3 3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-red-700">
                            Logout
                          </span>
                          <span className="block text-xs text-red-500/80">
                            Sign out of your account
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login?redirect=%2Fdashboard"
                  className="rounded-lg bg-slate-950 px-4.5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-slate-800 shadow-sm"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-slate-800 md:hidden"
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span
                className={`block h-0.5 w-5 bg-slate-800 transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""
                  }`}
              />
              <span
                className={`block h-0.5 w-5 bg-slate-800 transition-opacity ${menuOpen ? "opacity-0" : ""
                  }`}
              />
              <span
                className={`block h-0.5 w-5 bg-slate-800 transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""
                  }`}
              />
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE DRAWER: Categorized sections for Student Nav & Faculty LMS Suite   */}
        {/* ========================================================================= */}
        {menuOpen && (
          <div className="mt-3 border-t border-slate-200 pt-3 md:hidden">
            <div className="space-y-4">
              {/* Category 1: Student Navigation */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                <button
                  type="button"
                  onClick={() => setStudentMobileOpen(!studentMobileOpen)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Student Learning Nav
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 text-slate-400 transition-transform ${studentMobileOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {studentMobileOpen && (
                  <div className="mt-1 flex flex-col gap-1 border-t border-slate-200/60 pt-1.5">
                    {studentNavItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeMenus}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white hover:text-indigo-600"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Category 2: Faculty & Lab LMS Suite */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-100">
                <button
                  type="button"
                  onClick={() => setFacultyMobileOpen(!facultyMobileOpen)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Faculty & Lab LMS Suite
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 text-slate-400 transition-transform ${facultyMobileOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {facultyMobileOpen && (
                  <div className="mt-1 flex flex-col gap-1 border-t border-slate-800 pt-1.5">
                    {facultyNavItems.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <span className={item.color + " rounded p-1"}>{item.icon}</span>
                          {item.label}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {item.badge}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile User Auth Status */}
              <div className="pt-2">
                {!loading && user ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <UserAvatar
                        name={user.name}
                        email={user.email}
                        avatarUrl={user.avatarUrl}
                        size="mobile"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user.name || "Account"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Link
                        href="/dashboard"
                        onClick={closeMenus}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Go to Dashboard →
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login?redirect=%2Fdashboard"
                      onClick={closeMenus}
                      className="w-full rounded-xl bg-slate-950 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Login / Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
