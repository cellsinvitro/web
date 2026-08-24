"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { fetchStudyMaterials } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { formatResourceDate } from "@/lib/resources";
import ResourceLibraryList from "@/components/dashboard/ResourceLibraryList";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [resourceCount, setResourceCount] = useState<number | null>(null);

  useEffect(() => {
    fetchStudyMaterials()
      .then((materials) => setResourceCount(materials.length))
      .catch(() => setResourceCount(0));
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "there";
  const initials = user ? getInitials(user.name, user.email) : "";

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your personal hub for study materials, lab tools, and account details.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name || user.email}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-950">
                {user?.name || "Account"}
              </p>
              <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
              {user?.createdAt ? (
                <p className="mt-2 text-xs text-slate-400">
                  Member since {formatResourceDate(user.createdAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard
            label="Resources"
            value={resourceCount ?? "—"}
            hint="Available study materials"
          />
          <StatCard
            label="Account"
            value={user?.role === "ADMIN" ? "Admin" : "Member"}
            hint="Your access level"
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Jump to the sections you use most often.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/resources"
            className="inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Browse resources
          </Link>
          <Link
            href="/tools"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Lab tools
          </Link>
          <Link
            href="/dashboard/account"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Account settings
          </Link>
          {isAdmin(user?.role) ? (
            <Link
              href="/admin"
              className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Admin panel
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Recent resources
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest study materials added to the library.
            </p>
          </div>
          <Link
            href="/dashboard/resources"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          >
            View all
          </Link>
        </div>
        <ResourceLibraryList showHeader={false} limit={4} />
      </div>
    </div>
  );
}
