"use client";

import React, { useState } from "react";

export type DocParentType = "Lab" | "Container" | "Rack";

interface AddNewDocModalProps {
  isOpen: boolean;
  parentType: DocParentType;
  parentName: string;
  parentId: string;
  onClose: () => void;
  onCreate: (
    parentType: DocParentType,
    parentId: string,
    name: string,
    dimension?: number
  ) => void;
}

export default function AddNewDocModal({
  isOpen,
  parentType,
  parentName,
  parentId,
  onClose,
  onCreate,
}: AddNewDocModalProps) {
  const childType =
    parentType === "Lab" ? "Container" : parentType === "Container" ? "Rack" : "Box";

  const [name, setName] = useState("");
  const [dimension, setDimension] = useState<number>(9);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Name cannot be empty!");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 25) {
      setErrorMsg("Name length must be between 2 - 25 characters");
      return;
    }

    onCreate(parentType, parentId, trimmed, dimension);
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-base font-bold">Create New {childType}</h2>
            <p className="text-xs text-blue-100 opacity-90">Under {parentName}</p>
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

        <form onSubmit={handleSubmit} className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {childType} Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${
                childType === "Container"
                  ? "Dewar Tank Beta"
                  : childType === "Rack"
                  ? "Rack 02"
                  : "Box-03 (Primary Cells)"
              }`}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>

          {/* Dimension dropdown if creating a Box under a Rack */}
          {parentType === "Rack" && (
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Box Grid Dimension
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(parseInt(e.target.value, 10))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5 x 5 : (25 cells)</option>
                <option value={9}>9 x 9 : (81 cells - Standard CryoBox)</option>
                <option value={10}>10 x 10 : (100 cells)</option>
              </select>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Determines the row/column grid size for storing cryovials in this box.
              </p>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-500"
            >
              Create {childType}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
