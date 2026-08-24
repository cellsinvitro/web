"use client";

import { useCallback, useEffect, useState } from "react";
import UserDetailPanel from "@/components/admin/UserDetailPanel";
import {
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserRole,
} from "@/lib/api";
import type { AdminUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const userId = new URLSearchParams(window.location.search).get("user");
    if (userId) {
      setSelectedUserId(userId);
      window.history.replaceState({}, "", "/admin/users");
    }
  }, []);

  const openUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const closeUser = () => {
    setSelectedUserId(null);
  };

  const handleRoleChange = async (userId: string, role: "USER" | "ADMIN") => {
    setPendingId(userId);
    setActionError(null);
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...updated } : user))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Delete account for ${email}? This cannot be undone.`)) {
      return;
    }

    setPendingId(userId);
    setActionError(null);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      if (selectedUserId === userId) {
        closeUser();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setPendingId(null);
    }
  };

  const handlePanelUserUpdated = (updated: AdminUser) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user))
    );
  };

  const handlePanelUserDeleted = (userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  return (
    <>
      <div
        className={`px-5 py-6 transition-[padding] sm:px-8 sm:py-8 ${
          selectedUserId ? "pr-[25%]" : ""
        }`}
      >
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Accounts
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            View registered users, adjust roles, and remove accounts.
          </p>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isPending = pendingId === user.id;
                    const isSelected = selectedUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        onClick={() => openUser(user.id)}
                        className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80 ${
                          isSelected ? "bg-slate-50" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-950">
                            {user.name || "Unnamed user"}
                            {isSelf ? (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                You
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-4 capitalize text-slate-600">
                          {user.authProvider}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.role === "ADMIN"
                                ? "bg-slate-950 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            {user.role === "ADMIN" ? (
                              <button
                                type="button"
                                disabled={isSelf || isPending}
                                onClick={() => handleRoleChange(user.id, "USER")}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Make user
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleRoleChange(user.id, "ADMIN")}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Make admin
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isSelf || isPending}
                              onClick={() => handleDelete(user.id, user.email)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUserId ? (
        <UserDetailPanel
          userId={selectedUserId}
          onClose={closeUser}
          onUserUpdated={handlePanelUserUpdated}
          onUserDeleted={handlePanelUserDeleted}
        />
      ) : null}
    </>
  );
}
