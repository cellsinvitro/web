"use client";

import React, { useState } from "react";

export type ItemType = "Lab" | "Container" | "Rack" | "Box";

interface ItemOptionsModalProps {
  isOpen: boolean;
  itemType: ItemType;
  itemName: string;
  itemId: string;
  itemLocation: string; // e.g. "lab1/con1/rac1"
  onClose: () => void;
  onOpenBox?: () => void;
  onRename: (newName: string) => void;
  onAddChild?: () => void;
  onConfigureCellLines?: () => void;
  onDelete: () => void;
}

export default function ItemOptionsModal({
  isOpen,
  itemType,
  itemName,
  itemId,
  itemLocation,
  onClose,
  onOpenBox,
  onRename,
  onAddChild,
  onConfigureCellLines,
  onDelete,
}: ItemOptionsModalProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(itemName);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build the Share ID matching Flutter logic
  // e.g., "lab1/con1/rac1/box1" -> "lab1-con1-rac1-box1"
  const fullLoc = itemLocation ? `${itemLocation}/${itemId}` : itemId;
  const shareId = fullLoc.replace(/^\/+/, "").replace(/\//g, "-");

  const handleCopyShareId = () => {
    const textToShare = `Send Request on CryoSearch to get access to ${itemType}\n\n${itemType} ID: ${shareId}`;
    navigator.clipboard.writeText(textToShare);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== itemName) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-base font-bold">Configure {itemType}</h2>
            <p className="text-xs text-blue-100 opacity-90">{itemName}</p>
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

        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="p-6">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Rename {itemType}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow hover:bg-blue-500"
              >
                Save Name
              </button>
            </div>
          </form>
        ) : (
          <div className="divide-y divide-slate-100 py-2">
            {/* Open Box */}
            {itemType === "Box" && onOpenBox && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBox();
                }}
                className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-blue-600"
                >
                  <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                <span>Open Box Grid</span>
              </button>
            )}

            {/* Rename */}
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-blue-600"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Rename</span>
            </button>

            {/* Add Child */}
            {itemType !== "Box" && onAddChild && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddChild();
                }}
                className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-blue-600"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>
                  Add New{" "}
                  {itemType === "Lab"
                    ? "Container"
                    : itemType === "Container"
                    ? "Rack"
                    : "Box"}
                </span>
              </button>
            )}

            {/* Share ID */}
            <button
              type="button"
              onClick={handleCopyShareId}
              className="flex w-full items-center justify-between px-6 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-blue-600"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <div>
                  <div className="text-sm font-medium">Share ID</div>
                  <div className="font-mono text-[11px] text-slate-400">{shareId}</div>
                </div>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>

            {/* Configure Cell Line (Lab only) */}
            {itemType === "Lab" && onConfigureCellLines && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfigureCellLines();
                }}
                className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-blue-600"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Configure Cell Lines</span>
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${itemType} "${itemName}"? This will permanently remove all items nested inside it.`
                  )
                ) {
                  onDelete();
                  onClose();
                }
              }}
              className="flex w-full items-center gap-3 px-6 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-red-600"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Delete {itemType}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
