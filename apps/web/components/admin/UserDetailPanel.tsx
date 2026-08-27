"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  deleteAdminUser,
  fetchAdminUser,
  updateAdminUserRole,
} from "@/lib/api";
import type { AdminUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm text-slate-950">{value}</dd>
    </div>
  );
}

type UserDetailPanelProps = {
  userId: string;
  onClose: () => void;
  onUserUpdated: (user: AdminUser) => void;
  onUserDeleted: (userId: string) => void;
};

export default function UserDetailPanel({
  userId,
  onClose,
  onUserUpdated,
  onUserDeleted,
}: UserDetailPanelProps) {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUser(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleRoleChange = async (role: "USER" | "ADMIN") => {
    if (!user) return;

    setPending(true);
    setActionError(null);
    try {
      const updated = await updateAdminUserRole(user.id, role);
      const nextUser = { ...user, ...updated };
      setUser(nextUser);
      onUserUpdated(nextUser);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: "Delete account",
      message: `Delete account for ${user.email}? This cannot be undone.`,
      confirmLabel: "Delete account",
      variant: "danger",
    });
    if (!confirmed) return;

    setPending(true);
    setActionError(null);
    try {
      await deleteAdminUser(user.id);
      onUserDeleted(user.id);
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete user");
      setPending(false);
    }
  };

  const isSelf = user?.id === currentUser?.id;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-1/4 min-w-70 flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          User details
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close panel"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Loading user...</p>
        ) : error ? (
          <p className="px-4 py-10 text-center text-sm text-red-600">{error}</p>
        ) : user ? (
          <>
            <div className="border-b border-slate-100 px-4 py-5">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {user.name || "Unnamed user"}
                    {isSelf ? (
                      <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        You
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  user.role === "ADMIN"
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {user.role}
              </span>
            </div>

            {actionError ? (
              <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError}
              </div>
            ) : null}

            <dl>
              <DetailRow label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow
                label="Auth provider"
                value={<span className="capitalize">{user.authProvider}</span>}
              />
              <DetailRow label="Password" value={user.hasPassword ? "Set" : "Not set"} />
              <DetailRow label="Joined" value={formatDate(user.createdAt)} />
              <DetailRow label="Last updated" value={formatDate(user.updatedAt)} />
            </dl>

            <div className="border-t border-slate-100 px-4 py-4">
              <p className="text-xs font-semibold text-slate-950">Actions</p>
              <div className="mt-3 flex flex-col gap-2">
                {user.role === "ADMIN" ? (
                  <button
                    type="button"
                    disabled={isSelf || pending}
                    onClick={() => handleRoleChange("USER")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Make user
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRoleChange("ADMIN")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Make admin
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSelf || pending}
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete account
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
