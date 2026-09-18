"use client";

import { useEffect, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import {
  fetchLabTeam,
  sendLabInvite,
  cancelLabInvite,
  updateLabMemberPermission,
  type LabTeamMember,
  type LabInviteItem,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LogbookTeamPermissionsPage() {
  const { user } = useAuth();
  const isAdminUser = checkIsAdmin(user?.role);
  const { activeLab } = useLabWorkspace();

  const [activeTab, setActiveTab] = useState<"members" | "invites">("members");
  const [members, setMembers] = useState<LabTeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LabInviteItem[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadTeamData = async () => {
    if (!activeLab) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLabTeam(activeLab.id);
      setMembers(res.members);
      setPendingInvites(res.pendingInvites);
      setIsOwner(res.isOwner || isAdminUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load lab team permissions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [activeLab?.id]);

  const handleTogglePermission = async (
    userId: string,
    permKey: keyof LabTeamMember["permissions"],
    currentVal: boolean
  ) => {
    if (!activeLab || (!isOwner && !isAdminUser)) return;

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === userId
          ? {
              ...m,
              permissions: {
                ...m.permissions,
                [permKey]: !currentVal,
              },
            }
          : m
      )
    );

    try {
      await updateLabMemberPermission(activeLab.id, userId, {
        [permKey]: !currentVal,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update permission");
      await loadTeamData(); // rollback
    }
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLab || !inviteEmail.trim()) return;

    try {
      setInviting(true);
      setInviteError(null);
      setLastInviteLink(null);

      const res = await sendLabInvite(activeLab.id, inviteEmail.trim());
      const link = `${window.location.origin}/dashboard/logbook/invite/accept?token=${res.invite.token}`;
      setLastInviteLink(link);
      setInviteEmail("");
      await loadTeamData();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!activeLab || !confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await cancelLabInvite(activeLab.id, inviteId);
      await loadTeamData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  };

  const copyToClipboard = (token: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Team & Permissions"
        subtitle={`Manage team members and invitations for '${activeLab?.name || "Lab Workspace"}'`}
        isAdmin={isAdminUser}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card & Action Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{activeLab?.name} Workspace</h2>
                {isOwner && (
                  <span className="rounded-md bg-slate-950 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                    Lab Owner / Admin
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Team members invited to this lab appear below after accepting their email invitation.
              </p>
            </div>

            {(isOwner || isAdminUser) && (
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteError(null);
                  setLastInviteLink(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                </svg>
                Invite Team Member
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
                activeTab === "members"
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Active Team Members ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invites")}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
                activeTab === "invites"
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Pending Invitations ({pendingInvites.length})
            </button>
          </div>

          {/* ACTIVE MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          No active team members in this lab workspace yet. Use the 'Invite Team Member' button to add members.
                        </td>
                      </tr>
                    ) : (
                      members.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 font-bold text-white text-xs shadow-2xs">
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
                                u.role === "OWNER" || u.role === "ADMIN"
                                  ? "bg-slate-950 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canViewLogbook}
                              onChange={() =>
                                handleTogglePermission(u.id, "canViewLogbook", u.permissions.canViewLogbook)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canCreateEntries}
                              onChange={() =>
                                handleTogglePermission(u.id, "canCreateEntries", u.permissions.canCreateEntries)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canEditOwnEntries}
                              onChange={() =>
                                handleTogglePermission(u.id, "canEditOwnEntries", u.permissions.canEditOwnEntries)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canEditOthersEntries}
                              onChange={() =>
                                handleTogglePermission(u.id, "canEditOthersEntries", u.permissions.canEditOthersEntries)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canManageInstruments}
                              onChange={() =>
                                handleTogglePermission(u.id, "canManageInstruments", u.permissions.canManageInstruments)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>

                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              disabled={!isOwner && !isAdminUser}
                              checked={u.permissions.canGenerateReports}
                              onChange={() =>
                                handleTogglePermission(u.id, "canGenerateReports", u.permissions.canGenerateReports)
                              }
                              className="h-4 w-4 rounded-sm border-slate-300 text-slate-950 focus:ring-slate-900 accent-slate-950 disabled:opacity-50"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PENDING INVITATIONS TAB */}
          {activeTab === "invites" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Invitee Email</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Status</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Sent Date</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Expires</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pendingInvites.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No pending invitations. Click 'Invite Team Member' to send an email invitation.
                        </td>
                      </tr>
                    ) : (
                      pendingInvites.map((inv) => {
                        const link = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/logbook/invite/accept?token=${inv.token}`;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {inv.email}
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-200">
                                Pending Acceptance
                              </span>
                            </td>

                            <td className="px-6 py-4 text-center text-slate-500">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>

                            <td className="px-6 py-4 text-center text-slate-500">
                              {new Date(inv.expiresAt).toLocaleDateString()}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(inv.token, link)}
                                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
                                >
                                  {copiedToken === inv.token ? "✓ Copied Link" : "Copy Invite Link"}
                                </button>
                                {(isOwner || isAdminUser) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelInvite(inv.id)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                  >
                                    Cancel
                                  </button>
                                )}
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
          )}
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Invite Team Member to Lab</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInviteSubmit} className="mt-4 space-y-4">
              {inviteError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {inviteError}
                </div>
              )}

              {lastInviteLink ? (
                <div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <svg className="h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Invitation Created Successfully!
                  </div>
                  <p className="text-[11px] text-slate-600">
                    An email invitation has been generated. You can also copy and share the direct invitation link below:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lastInviteLink}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard("modal", lastInviteLink)}
                      className="shrink-0 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {copiedToken === "modal" ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Team Member Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="researcher@lab.org"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    An invitation will be generated. Once they click and accept, they will join '{activeLab?.name}' and their permissions will become configurable.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {lastInviteLink ? "Close" : "Cancel"}
                </button>
                {!lastInviteLink && (
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                  >
                    {inviting ? "Sending..." : "Send Invitation"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
