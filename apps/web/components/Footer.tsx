"use client";

import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  {
    title: "Explore",
    links: [
      { label: "Home", href: "#home" },
      { label: "Research Kits", href: "#kits" },
      { label: "Features", href: "#features" },
      { label: "Our Team", href: "#team" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Anti-Cancer", href: "#kits" },
      { label: "Anti-Oxidant", href: "#kits" },
      { label: "Anti-Diabetic", href: "#kits" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#080d1c] text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* Main Footer */}
        <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr]">

          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="#home"
              className="inline-flex items-center gap-3"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white">
                <Image
                  src="/images/logo.png"
                  alt="CellsInVitro logo"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>

              <div>
                <p className="text-lg font-semibold tracking-tight text-white">
                  CellsInVitro
                </p>

                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Research & Innovation
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Advancing cellular research through research-focused
              solutions, scientific learning, and innovation.
            </p>
          </div>

          {/* Explore */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </h3>

              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Connect */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Connect
            </h3>

            <div className="mt-5 space-y-3 text-sm">
              <a
                href="mailto:info@cellsinvitro.com"
                className="block text-slate-400 transition-colors hover:text-white"
              >
                info@cellsinvitro.com
              </a>

              <a
                href="https://cellsinvitro.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-slate-400 transition-colors hover:text-white"
              >
                cellsinvitro.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-4 border-t border-slate-800 py-6 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-slate-500">
            © 2026 CellsInVitro. All rights reserved.
          </p>

          <p className="text-xs text-slate-500">
            Research use only.
          </p>

        </div>
      </div>
    </footer>
  );
}