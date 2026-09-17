"use client";

import { useEffect, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import {
  fetchLogbookPermissions,
  updateLogbookPermission,
  type LogbookUserWithPermissions,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LogbookTeamPermissionsPage() {
  const { user } = useAuth();
  const isAdminUser = checkIsAdmin(user?.role);

  const [teamUsers, setTeamUsers] = useState<LogbookUserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLogbookPermissions();
      setTeamUsers(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load team permissions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const handleTogglePermission = async (
    userId: string,
    permKey: keyof LogbookUserWithPermissions["permissions"],
    currentVal: boolean
  ) => {
    // Optimistic UI update
    setTeamUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              permissions: {
                ...u.permissions,
                [permKey]: !currentVal,
              },
            }
          : u
      )
    );

    try {
      await updateLogbookPermission(userId, {
        [permKey]: !currentVal,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update permission");
      await loadPermissions(); // rollback
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Team & Permissions"
        subtitle="Manage team members and grant granular authorizations for Logbook features"
        isAdmin={isAdminUser}
      />

      {!isAdminUser ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Only Laboratory Administrators can manage team member logbook permissions.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Laboratory Team Members</h2>
            <p className="text-xs text-slate-500">
              Configure access permissions for instrument booking, logbook viewing, management, and reports.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">User</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Role</th>
                  <th className="px-6 py-3.5 text-center font-semibold">View Logbook</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Create Entries</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Edit Own</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Edit Others</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Manage Instruments</th>
                  <th className="px-6 py-3.5 text-center font-semibold">Generate Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {teamUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canViewLogbook}
                        onChange={() =>
                          handleTogglePermission(u.id, "canViewLogbook", u.permissions.canViewLogbook)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canCreateEntries}
                        onChange={() =>
                          handleTogglePermission(u.id, "canCreateEntries", u.permissions.canCreateEntries)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canEditOwnEntries}
                        onChange={() =>
                          handleTogglePermission(u.id, "canEditOwnEntries", u.permissions.canEditOwnEntries)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canEditOthersEntries}
                        onChange={() =>
                          handleTogglePermission(u.id, "canEditOthersEntries", u.permissions.canEditOthersEntries)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canManageInstruments}
                        onChange={() =>
                          handleTogglePermission(u.id, "canManageInstruments", u.permissions.canManageInstruments)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canGenerateReports}
                        onChange={() =>
                          handleTogglePermission(u.id, "canGenerateReports", u.permissions.canGenerateReports)
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
