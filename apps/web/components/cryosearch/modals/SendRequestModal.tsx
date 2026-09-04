"use client";

import React, { useState } from "react";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (itemId: string) => void;
}

export default function SendRequestModal({
  isOpen,
  onClose,
  onSendRequest,
}: SendRequestModalProps) {
  const [reqId, setReqId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reqId.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg("ID cannot be empty!");
      return;
    }
    if (trimmed.length < 4 || trimmed.length > 35) {
      setErrorMsg("Length must be between 4 and 35 characters");
      return;
    }
    if (!trimmed.startsWith("lab")) {
      setErrorMsg("Invalid ID: Must start with 'lab' (e.g. lab1-con1-rac1)");
      return;
    }

    onSendRequest(trimmed);
    setReqId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-6 py-4 text-white">
          <h2 className="text-base font-bold">Send Access Request</h2>
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
              Enter Shared Item ID
            </label>
            <input
              type="text"
              value={reqId}
              onChange={(e) => setReqId(e.target.value)}
              placeholder="e.g. lab1-con1-rac1-box1"
              className="w-full rounded-xl border border-slate-300 font-mono px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              required
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Ask your lab collaborator to copy and share their item ID.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
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
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
