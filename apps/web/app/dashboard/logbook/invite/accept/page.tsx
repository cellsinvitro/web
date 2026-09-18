"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { acceptLabInvite } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading: authLoading } = useAuth();
  const { refreshLabs, setActiveLabId } = useLabWorkspace();

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ labName: string; labId: string } | null>(null);

  const handleAcceptInvite = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      setError(null);

      const res = await acceptLabInvite(token);
      setSuccessInfo({ labName: res.labName, labId: res.labId });
      await refreshLabs();
      setActiveLabId(res.labId);

      setTimeout(() => {
        router.push("/dashboard/logbook");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept lab invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Log in to Accept Invitation</h2>
          <p className="mt-2 text-xs text-slate-500">
            You received an invitation to join a Laboratory Workspace. Please log in or create an account to accept.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/dashboard/logbook/invite/accept?token=${token}`)}`)}
            className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            Log In to Continue
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-800">
          <h2 className="text-base font-bold">Invalid Invitation Link</h2>
          <p className="mt-2 text-xs">No invitation token was provided in the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        <div className="bg-slate-950 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-inner">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold">Join Laboratory Workspace</h2>
          <p className="mt-1 text-xs text-slate-400">
            You've been invited to collaborate on a Lab Book
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {successInfo ? (
            <div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-center">
              <div className="text-sm font-bold text-slate-950">
                🎉 Successfully Joined {successInfo.labName}!
              </div>
              <p className="text-xs text-slate-600">
                Redirecting you to the Lab Logbook dashboard...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-600">
                  Signed in as <span className="font-bold text-slate-900">{user.email}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Accepting this invitation will add you to the lab team and grant you access to instrument logbooks.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAcceptInvite}
                disabled={accepting}
                className="w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                {accepting ? "Joining Lab..." : "Accept & Join Lab Workspace"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptLabInvitePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
