"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LoginRequiredModal({
  isOpen,
  onClose,
  message = "Please login to calculate",
}: {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-slate-950">{message}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Please login to compute calculations, store session results, and access your daily free allowance or unlimited subscription.
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            Login to Calculate
          </Link>
        </div>
      </div>
    </div>
  );
}
