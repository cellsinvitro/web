"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { formatResourceDate } from "@/lib/resources";

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

export default function DashboardAccountPage() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = getInitials(user.name, user.email);

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Profile & access
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account details and membership information.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name || user.email}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-base font-semibold text-white">
              {initials}
            </span>
          )}
          <div>
            <p className="text-xl font-semibold text-slate-950">
              {user.name || "Unnamed user"}
            </p>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Role
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {user.role === "ADMIN" ? "Administrator" : "Member"}
            </dd>
          </div>
          {user.createdAt ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatResourceDate(user.createdAt)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Resource library
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              Available after login through your dashboard.
            </dd>
          </div>
        </dl>

        {isAdmin(user.role) ? (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-sm text-slate-500">
              You have admin access to manage users and upload resources.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Open admin panel
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
