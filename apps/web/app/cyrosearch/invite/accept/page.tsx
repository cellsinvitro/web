"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageLoadingScreen from "@/components/PageLoadingScreen";
import { previewStockInvite, acceptStockInvite } from "@/lib/api";

export default function AcceptStockInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [preview, setPreview] = useState<{
    id: string;
    labId: string;
    labName: string;
    inviterName: string;
    email: string;
    role: string;
    status: string;
    isExpired: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    previewStockInvite(token)
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load invitation details."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await acceptStockInvite(token);
      setSuccessMsg(res.message);
      setTimeout(() => {
        router.push("/cyrosearch?tab=stock");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <PageLoadingScreen sublabel="Verifying invitation link..." />;
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-red-900">Invitation Unavailable</h2>
          <p className="mt-2 text-sm text-red-700">{error ?? "The invitation link is invalid or expired."}</p>
          <button
            type="button"
            onClick={() => router.push("/cyrosearch?tab=stock")}
            className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Go to CyroSearch Stock Management
          </button>
        </div>
      </div>
    );
  }

  if (preview.isExpired || preview.status !== "PENDING") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-amber-900">
            {preview.isExpired ? "Invitation Expired" : `Invitation Already ${preview.status}`}
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            {preview.isExpired
              ? "This lab invitation link has expired. Please request a new invite from your lab administrator."
              : `This invitation has already been ${preview.status.toLowerCase()}.`}
          </p>
          <button
            type="button"
            onClick={() => router.push("/cyrosearch?tab=stock")}
            className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Go to CyroSearch Stock Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-950 p-8 text-white text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white mb-4 backdrop-blur-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
            Lab Workspace Invitation
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{preview.labName}</h1>
          <p className="mt-1 text-xs text-slate-400">Stock Management & Inventory Workspace</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Invited By:</span>
              <span className="font-bold text-slate-900">{preview.inviterName}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-3">
              <span className="text-slate-500 font-medium">Invited Email:</span>
              <span className="font-bold text-slate-900">{preview.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-3">
              <span className="text-slate-500 font-medium">Assigned Role:</span>
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                {preview.role}
              </span>
            </div>
          </div>

          {successMsg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-xs font-bold text-emerald-800">✓ {successMsg}</p>
              <p className="text-[11px] text-emerald-600 mt-1">Redirecting to Stock Management...</p>
            </div>
          ) : (
            <button
              type="button"
              disabled={accepting}
              onClick={handleAccept}
              className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {accepting ? "Joining Lab Workspace..." : "Accept Invitation & Join Lab"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
