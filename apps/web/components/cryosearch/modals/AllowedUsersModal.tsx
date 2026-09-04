"use client";

import React from "react";
import { AllowedUsersModel } from "@/lib/cryosearch/types";

interface AllowedUsersModalProps {
  isOpen: boolean;
  users: AllowedUsersModel[];
  onClose: () => void;
  onRevokeAccess: (userId: string, allowedItem: string) => void;
}

export default function AllowedUsersModal({
  isOpen,
  users,
  onClose,
  onRevokeAccess,
}: AllowedUsersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h2 className="text-base font-bold">Allowed / Shared Users</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="mb-4 text-xs text-slate-500">
            Collaborators with granted permissions to your laboratory items. You can revoke access at any time.
          </p>

          <div className="max-h-72 overflow-y-auto space-y-2.5">
            {users.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No external users currently have access to your repository.
              </div>
            ) : (
              users.map((u, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 font-bold text-pink-700">
                        {u.userName && u.userName[0] ? u.userName[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{u.userName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {u.allowedItem}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRevokeAccess(u.userId, u.allowedItem)}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Revoke Access
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">{u.allowedItemType}: </span>
                    {u.allowedItemName.join(" > ")}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
