"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";


const navItems = [
  { label: "", href: "/" },
  { label: "Tools", href: "/tools" },
  { label: "CyroSearch", href: "/cyrosearch" },
  { label: "Resource Library", href: "/resources" },
  { label: "Research Kits", href: "/#kits" },
  { label: "Contact", href: "/contact" },
];

const menuLinks = [
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
    label: "CyroSearch",
    description: "Search for your desired cyrosearch",
    href: "/cyrosearch",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Contact",
    description: "Reach our team",
    href: "/contact",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 6h16v12H4z" strokeLinejoin="round" />
        <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  // {
  //   label: "Tools",
  //   description: "Free lab calculators",
  //   href: "/tools",
  //   icon: (
  //     <svg
  //       viewBox="0 0 24 24"
  //       className="h-4 w-4"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="1.8"
  //     >
  //       <rect x="4" y="2" width="16" height="20" rx="2" />
  //       <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h4" strokeLinecap="round" />
  //     </svg>
  //   ),
  // },
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
  const { user, loading, logout } = useAuth();

  const closeMenus = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
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
                  href="/login"
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
                    <Link
                      href="/login"
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
