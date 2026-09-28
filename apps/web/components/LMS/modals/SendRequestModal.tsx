"use client";

import React, { useState } from "react";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (itemId: string) => void; // kept for compatibility, unused
  onSendEmailInvite: (email: string, itemId: string) => Promise<{ emailSent: boolean; acceptUrl: string }>;
}

export default function SendRequestModal({
  isOpen,
  onClose,
  onSendEmailInvite,
}: SendRequestModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; acceptUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setEmail("");
    setError("");
    setSending(false);
    setResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCopy = async () => {
    if (!result?.acceptUrl) return;
    await navigator.clipboard.writeText(result.acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await onSendEmailInvite(trimmed, "");
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between bg-pink-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
              <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
              <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
            </svg>
            <h2 className="text-sm font-bold">Invite Collaborator</h2>
          </div>
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

        {/* Capacity info */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-pink-500">
            <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
          </svg>
          <p className="text-[11px] text-slate-500">
            Max <span className="font-semibold text-slate-700">4 users</span> +{" "}
            <span className="font-semibold text-slate-700">1 admin</span> per repository
          </p>
        </div>

        <div className="p-6">
          {result ? (
            /* ── Result state ── */
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              {result.emailSent ? (
                /* Email delivered */
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-emerald-600">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Invite sent!</p>
                    <p className="mt-1 text-xs text-slate-500">
                      A secure invite link has been emailed to{" "}
                      <span className="font-semibold text-pink-600">{email}</span>.
                      They can accept it to gain access.
                    </p>
                  </div>
                </>
              ) : (
                /* Email failed — show manual link */
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-amber-600">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="w-full">
                    <p className="text-sm font-bold text-slate-900">Invite created</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Email delivery is currently unavailable. Share this invite link manually with{" "}
                      <span className="font-semibold text-slate-700">{email}</span>:
                    </p>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="flex-1 truncate text-[11px] font-mono text-slate-700">
                        {result.acceptUrl}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 rounded-lg bg-pink-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-pink-500"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Link expires in 72 hours.
                    </p>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 rounded-xl bg-pink-600 px-6 py-2 text-xs font-bold text-white hover:bg-pink-500"
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                  {error}
                </div>
              )}

              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Collaborator&apos;s Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  They&apos;ll receive an email with a secure link to accept repository access.
                  Admin can then grant access to specific items.
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
                  disabled={sending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-2.5 text-xs font-bold text-white shadow hover:bg-pink-500 disabled:opacity-60"
                >
                  {sending ? (
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
      </div>
    </div>
  );
}
