"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navItems = [
  { label: "Home", href: "/#home" },
  { label: "Research Kits", href: "/#kits" },
  { label: "Features", href: "/#features" },
  { label: "About", href: "/#team" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <nav className="rounded-2xl border border-white/40 bg-white/35 px-5 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setMenuOpen(false)}
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

            {/* Desktop Navigation */}
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

            {/* CTA */}
            <div className="hidden md:block">
              <Link
                href="/contact"
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
              >
                Contact Us
              </Link>
            </div>

            {/* Mobile Button */}
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

          {/* Mobile Navigation */}
          {menuOpen && (
            <div className="mt-3 border-t border-white/40 pt-3 md:hidden">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white/30 hover:text-slate-950"
                  >
                    {item.label}
                  </Link>
                ))}

                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}