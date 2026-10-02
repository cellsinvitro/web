"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";


const navItems = [
  { label: "Courses", href: "/courses" },
  { label: "Tools", href: "/tools" },
];

const navItemsAfterLms = [
  { label: "Resource Library", href: "/resources" },
  { label: "Research Kits", href: "/kits" },
  { label: "Contact", href: "/contact" },
];

const lmsFeatures = [
  {
    key: "lms_repo",
    label: "CryoSearch",
    badge: "Cell Banking",
    description: "2D visual rack & box layout, cryovial inventory, dewar tracking.",
    href: "/LMS?tab=repo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" strokeLinejoin="round" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.5m-1.5 0h-1.5m-8.25 0H6m1.5 0H6" />
      </svg>
    ),
    color: "bg-amber-50 text-amber-600",
  },
  {
    key: "lms_logbook",
    label: "Lab Logbook",
    badge: "ELN Notebook",
    description: "Electronic lab notebook, protocols & experiment logs.",
    href: "/LMS?tab=logbook",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
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
    href: "/cyrosearch?tab=logbook",
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
    href: "/dashboard/resources",
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
  const [lmsMenuOpen, setLmsMenuOpen] = useState(false);
  const [lmsMobileOpen, setLmsMobileOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  const closeMenus = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setLmsMenuOpen(false);
    setLmsMobileOpen(false);
  };

  const handleLogout = async () => {
    closeMenus();
    await logout();
  };

  const displayName = user?.name || user?.email || "";

  return (
    <header className="fixed left-0 top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <nav className="rounded-2xl border border-white/40 bg-white/35 px-5 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={closeMenus}
            >
              <Image
                src="/images/logo.png"
                alt="CellsInVitro"
                width={44}
                height={44}
                className="h-10 w-10 object-contain"
                priority
              />

              <div className="leading-none">
                <span className="block text-lg font-bold tracking-tight text-slate-950">
                  CellsInVitro
                </span>
                <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Research & Innovation
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-9 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
              {/* LMS dropdown — sits between Tools and Resource Library */}
              <div
                className="relative"
                onMouseEnter={() => setLmsMenuOpen(true)}
                onMouseLeave={() => setLmsMenuOpen(false)}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
                  aria-haspopup="menu"
                  aria-expanded={lmsMenuOpen}
                >
                  LMS
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${lmsMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div
                  role="menu"
                  className={`absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3 transition-all duration-150 ${
                    lmsMenuOpen
                      ? "visible translate-y-0 opacity-100"
                      : "invisible -translate-y-1 opacity-0"
                  }`}
                >
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
                    {/* Header */}
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Lab Management Suite
                      </p>
                    </div>

                    {/* Feature links */}
                    <div className="p-1.5">
                      {lmsFeatures.map((feature) => (
                        <Link
                          key={feature.key}
                          href={feature.href}
                          role="menuitem"
                          onClick={closeMenus}
                          className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${feature.color}`}>
                            {feature.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="block text-sm font-medium text-slate-900">
                                {feature.label}
                              </span>
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {feature.badge}
                              </span>
                            </span>
                            <span className="block text-xs text-slate-500">
                              {feature.description}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="border-t border-slate-100 p-2">
                      <Link
                        href="/LMS"
                        onClick={closeMenus}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-500"
                      >
                        Open LMS
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              {navItemsAfterLms.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              {!loading && user ? (
                <div
                  className="relative"
                  onMouseEnter={() => setUserMenuOpen(true)}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/50"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <UserAvatar
                      name={user.name}
                      email={user.email}
                      avatarUrl={user.avatarUrl}
                    />
                    <span className="max-w-36 truncate text-sm font-medium text-slate-800">
                      {displayName}
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                        userMenuOpen ? "rotate-180" : ""
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

                  <div
                    role="menu"
                    className={`absolute right-0 top-full z-50 w-72 pt-2 transition-all duration-150 ${
                      userMenuOpen
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
                <Link
                  href="/login?redirect=%2Fdashboard"
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  Login
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300/60 bg-white/30 backdrop-blur-sm md:hidden"
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <span
                  className={`block h-0.5 w-5 bg-slate-800 transition-transform ${
                    menuOpen ? "translate-y-2 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-slate-800 transition-opacity ${
                    menuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-slate-800 transition-transform ${
                    menuOpen ? "-translate-y-2 -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>

          {menuOpen && (
            <div className="mt-3 border-t border-white/40 pt-3 md:hidden">
              <div className="flex flex-col gap-1">
                {!loading && user ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          avatarUrl={user.avatarUrl}
                          size="mobile"
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
                    {isAdmin(user.role) ? (
                      <Link
                        href="/admin"
                        onClick={closeMenus}
                        className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/60"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
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
                        Admin
                      </Link>
                    ) : null}
                    {menuLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeMenus}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/60"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    ))}
                    {/* LMS expandable section — mobile logged in */}
                    <div className="border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setLmsMobileOpen(!lmsMobileOpen)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1 1 .03 2.7-1.4 2.7H4.2c-1.43 0-2.4-1.7-1.4-2.7L4.2 15.3" />
                            </svg>
                          </span>
                          LMS
                        </span>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${lmsMobileOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {lmsMobileOpen && (
                        <>
                          {lmsFeatures.map((feature) => (
                            <Link
                              key={feature.key}
                              href={feature.href}
                              onClick={closeMenus}
                              className="flex items-center gap-3 border-t border-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white/60"
                            >
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${feature.color}`}>
                                {feature.icon}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{feature.label}</span>
                                <span className="block text-[11px] text-slate-400">{feature.badge}</span>
                              </span>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50/70"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    {navItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeMenus}
                        className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/30 hover:text-slate-950"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {/* LMS expandable section — mobile guest */}
                    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white/60">
                      <button
                        type="button"
                        onClick={() => setLmsMobileOpen(!lmsMobileOpen)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        LMS
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${lmsMobileOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {lmsMobileOpen && (
                        <div className="border-t border-slate-100">
                          {lmsFeatures.map((feature) => (
                            <Link
                              key={feature.key}
                              href={feature.href}
                              onClick={closeMenus}
                              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/60"
                            >
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${feature.color}`}>
                                {feature.icon}
                              </span>
                              {feature.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    {navItemsAfterLms.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeMenus}
                        className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/30 hover:text-slate-950"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <Link
                      href="/login?redirect=%2Fdashboard"
                      onClick={closeMenus}
                      className="mt-2 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
