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
  const { user, updateProfile, deleteAccount } = useAuth();
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState<Designation | "">("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDeleteAccount = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account. Please try again.",
      );
      setIsDeleting(false);
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

        {/* Danger Zone */}
        <section className="overflow-hidden rounded-2xl border border-red-200/80 bg-linear-to-br from-red-50/50 via-white to-red-50/20 p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-red-100" />
            <h2 className="text-base font-semibold text-red-950">
              Danger Zone
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Permanently delete your account and all associated data across CellsInVitro. All course progress, certificates, payments, lab workspaces, and activity history will be completely erased from our database. <strong className="font-semibold text-red-700">This action cannot be undone.</strong>
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setConfirmInput("");
                setDeleteError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-red-700 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clipRule="evenodd"
                />
              </svg>
              Delete Account
            </button>
          </div>
        </section>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.75"
                  stroke="currentColor"
                  className="h-6 w-6 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Delete Account & Data?
                </h3>
                <p className="text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                This action is <strong className="font-semibold text-slate-900">permanent and irreversible</strong>. All data associated with your account will be purged from the database:
              </p>

              <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-100 list-disc list-inside">
                <li>Personal profile information & credentials</li>
                <li>Lab workspaces, instruments & stock inventory</li>
                <li>Course enrollments, progress & certificates</li>
                <li>Budget records & consultancy bookings</li>
                <li>All activity logs & download history</li>
              </ul>

              <div className="pt-2">
                <label
                  htmlFor="confirm-delete-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  To confirm deletion, please type <span className="font-bold text-red-600 select-all">DELETE</span> below:
                </label>
                <input
                  id="confirm-delete-input"
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  autoFocus
                />
              </div>

              {deleteError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {deleteError}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmInput("");
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmInput.trim().toUpperCase() !== "DELETE"}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting account…
                  </>
                ) : (
                  "Permanently Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
