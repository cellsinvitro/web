"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import type { Designation } from "@/lib/auth-storage";
import { isAdmin } from "@/lib/admin";
import {
  DESIGNATION_OPTIONS,
  getDesignationLabel,
} from "@/lib/profile";
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
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState<Designation | "">("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setDesignation(user.designation ?? "");
    }
  }, [user]);

  if (!user) return null;

  const initials = getInitials(user.name, user.email);
  const designationLabel = getDesignationLabel(user.designation);
  const hasChanges =
    name.trim() !== (user.name ?? "") ||
    (designation || null) !== (user.designation ?? null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await updateProfile({
        name: name.trim(),
        designation: designation || null,
      });
      setSaveMessage("Profile updated successfully.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Profile
        </p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name || user.email}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-white"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-xl font-semibold text-white ring-4 ring-white">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {user.name || "Your profile"}
            </h1>
            {designationLabel ? (
              <p className="mt-1 text-sm font-medium text-slate-600">
                {designationLabel}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {designationLabel ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {designationLabel}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {user.role === "ADMIN" ? "Administrator" : "Member"}
              </span>
              {user.createdAt ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Joined {formatResourceDate(user.createdAt)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Edit profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update how your name and academic designation appear across
            CellsInVitro.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-designation"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                Degree / designation
              </label>
              <select
                id="profile-designation"
                value={designation}
                onChange={(e) =>
                  setDesignation(e.target.value as Designation | "")
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">Select designation</option>
                {DESIGNATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                e.g. PhD, MSc, Professor — shown on your profile.
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                Email
              </label>
              <p className="mt-2 text-sm text-slate-700">{user.email}</p>
              <p className="mt-1 text-xs text-slate-400">
                Email is managed through your sign-in provider and cannot be
                changed here.
              </p>
            </div>

            {saveMessage ? (
              <p className="text-sm text-green-700">{saveMessage}</p>
            ) : null}
            {saveError ? (
              <p className="text-sm text-red-600">{saveError}</p>
            ) : null}

            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Account access
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Membership and platform access details.
          </p>

          <dl className="mt-6 divide-y divide-slate-100">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Designation</dt>
              <dd className="text-sm font-medium text-slate-900">
                {designationLabel ?? "Not set"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Role</dt>
              <dd className="text-sm font-medium text-slate-900">
                {user.role === "ADMIN" ? "Administrator" : "Member"}
              </dd>
            </div>
            {user.createdAt ? (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-slate-500">Member since</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {formatResourceDate(user.createdAt)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Resource library</dt>
              <dd className="text-sm font-medium text-slate-900">
                Available in your dashboard
              </dd>
            </div>
          </dl>
        </section>

        {isAdmin(user.role) ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              Admin access
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              You can manage users, courses, and site content.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Open admin panel
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
