"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";

export default function LogbookHeader({
  title = "Lab Log-Book",
  subtitle = "Manage laboratory instruments, equipment logs, bookings & notebooks",
  canManageInstruments = false,
  canGenerateReports = false,
  isAdmin = false,
  onAddInstrument,
}: {
  title?: string;
  subtitle?: string;
  canManageInstruments?: boolean;
  canGenerateReports?: boolean;
  isAdmin?: boolean;
  onAddInstrument?: () => void;
}) {
  const pathname = usePathname();
  const { labs, activeLab, setActiveLabId, createNewLab } = useLabWorkspace();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [newLabDesc, setNewLabDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tabs = [
    { label: "Instruments", href: "/dashboard/logbook" },
    { label: "Lab Notebook", href: "/dashboard/logbook/notebook" },
    ...(canGenerateReports || isAdmin
      ? [{ label: "Reports", href: "/dashboard/logbook/reports" }]
      : []),
    { label: "Activity Log", href: "/dashboard/logbook/activity" },
    { label: "Team & Permissions", href: "/dashboard/logbook/team" },
  ];

  const handleCreateLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabName.trim()) return;

    try {
      setCreating(true);
      setCreateError(null);
      await createNewLab(newLabName.trim(), newLabDesc.trim());
      setIsCreateModalOpen(false);
      setNewLabName("");
      setNewLabDesc("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create Lab Workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {title}
              </h1>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>

          {/* Lab Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-300"
            >
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="max-w-[140px] truncate">
                {activeLab ? activeLab.name : "Select Lab Workspace"}
              </span>
              {activeLab?.isOwner && (
                <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">
                  Owner
                </span>
              )}
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 z-30 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Your Lab Workspaces
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {labs.map((lab) => (
                    <button
                      key={lab.id}
                      type="button"
                      onClick={() => {
                        setActiveLabId(lab.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                        activeLab?.id === lab.id ? "bg-teal-50/70 font-bold text-teal-900" : "text-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate font-semibold">{lab.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {lab.isOwner ? "Created by you" : "Team Member"} • {lab.membersCount} member(s)
                        </p>
                      </div>
                      {activeLab?.id === lab.id && (
                        <svg className="h-4 w-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    + Create New Lab Book
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {onAddInstrument && canManageInstruments && (
          <button
            type="button"
            onClick={onAddInstrument}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Instrument
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar">
        <div className="flex gap-2 pb-px">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/dashboard/logbook"
                ? pathname === "/dashboard/logbook"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-teal-600 text-teal-700 font-semibold"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Create New Lab Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Create New Lab Book</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLabSubmit} className="mt-4 space-y-4">
              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Lab Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Molecular Biology Lab B"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of research or lab scope..."
                  value={newLabDesc}
                  onChange={(e) => setNewLabDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Lab Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
