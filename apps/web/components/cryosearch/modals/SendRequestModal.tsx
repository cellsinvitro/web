"use client";

import React, { useState } from "react";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Existing flow: request access by entering a shared item ID */
  onSendRequest: (itemId: string) => void;
  /** New flow: owner sends an email invite for a specific item */
  onSendEmailInvite: (email: string, itemId: string) => Promise<void>;
}

type Mode = "id" | "email";

export default function SendRequestModal({
  isOpen,
  onClose,
  onSendRequest,
  onSendEmailInvite,
}: SendRequestModalProps) {
  const [mode, setMode] = useState<Mode>("email");

  // ── "Enter ID" mode state ──
  const [reqId, setReqId] = useState("");
  const [idError, setIdError] = useState("");

  // ── "Invite by Email" mode state ──
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteItemId, setInviteItemId] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  if (!isOpen) return null;

  const resetAll = () => {
    setReqId("");
    setIdError("");
    setInviteEmail("");
    setInviteItemId("");
    setEmailError("");
    setEmailSending(false);
    setEmailSuccess(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Enter-ID submit ──
  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reqId.trim().toLowerCase();
    if (!trimmed) { setIdError("ID cannot be empty!"); return; }
    if (trimmed.length < 4 || trimmed.length > 35) {
      setIdError("Length must be between 4 and 35 characters");
      return;
    }
    if (!trimmed.startsWith("lab")) {
      setIdError("Invalid ID: Must start with 'lab' (e.g. lab1-con1-rac1)");
      return;
    }
    onSendRequest(trimmed);
    resetAll();
    onClose();
  };

  // ── Email invite submit ──
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    const itemId = inviteItemId.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!itemId || !itemId.startsWith("lab")) {
      setEmailError("Item ID must start with 'lab' (e.g. lab-xxx-con-xxx)");
      return;
    }

    setEmailError("");
    setEmailSending(true);
    try {
      await onSendEmailInvite(email, itemId);
      setEmailSuccess(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">

        {/* Header */}
        <div className="flex items-center justify-between bg-pink-600 px-6 py-4 text-white">
          <h2 className="text-base font-bold">
            {mode === "email" ? "Invite by Email" : "Send Access Request"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setMode("email"); resetAll(); }}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              mode === "email"
                ? "border-pink-600 text-pink-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
              <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
            </svg>
            Invite by Email
          </button>
          <button
            type="button"
            onClick={() => { setMode("id"); resetAll(); }}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              mode === "id"
                ? "border-pink-600 text-pink-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 0 1 .633 1.265l-4 12a1 1 0 1 1-1.898-.632l4-12a1 1 0 0 1 1.265-.633ZM5.707 6.293a1 1 0 0 1 0 1.414L3.414 10l2.293 2.293a1 1 0 1 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 0Zm8.586 0a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 1 1-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
            </svg>
            Enter Item ID
          </button>
        </div>

        {/* ── Email invite panel ── */}
        {mode === "email" && (
          <div className="p-6">
            {emailSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-emerald-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Invite sent!</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    An email has been sent to{" "}
                    <span className="font-semibold text-pink-600">{inviteEmail}</span>.
                    They&apos;ll get a link to accept access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-xl bg-pink-600 px-5 py-2 text-xs font-bold text-white hover:bg-pink-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                {emailError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                    {emailError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Collaborator&apos;s Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    autoFocus
                    required
                  />
                </div>

                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Item ID to Share
                  </label>
                  <input
                    type="text"
                    value={inviteItemId}
                    onChange={(e) => setInviteItemId(e.target.value)}
                    placeholder="e.g. lab-xxx-con-xxx-rac-xxx"
                    className="w-full rounded-xl border border-slate-300 font-mono px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Copy the item ID from the &hellip; options menu of any Lab, Container, Rack, or Box.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailSending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-2.5 text-xs font-bold text-white shadow hover:bg-pink-500 disabled:opacity-60"
                  >
                    {emailSending ? (
                      <>
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                          <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                        </svg>
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Enter Item ID panel ── */}
        {mode === "id" && (
          <form onSubmit={handleIdSubmit} className="p-6">
            {idError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                {idError}
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
                className="w-full rounded-xl border border-slate-300 font-mono px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-pink-600 py-2.5 text-xs font-bold text-white shadow hover:bg-pink-500"
              >
                Send Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
