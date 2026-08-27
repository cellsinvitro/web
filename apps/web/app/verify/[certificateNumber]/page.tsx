"use client";

import { useEffect, useState } from "react";
import { verifyCertificate } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const [certificateNumber, setCertificateNumber] = useState<string>("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyCertificate>> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => {
      setCertificateNumber(p.certificateNumber);
      verifyCertificate(p.certificateNumber)
        .then(setResult)
        .catch(() => setError("Certificate not found or invalid"))
        .finally(() => setLoading(false));
    });
  }, [params]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-lg px-5 py-16 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Verification
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Certificate verification
          </h1>

          {loading ? (
            <p className="mt-8 text-sm text-slate-500">Verifying…</p>
          ) : error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-medium text-red-900">Invalid certificate</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-2 text-xs font-mono text-red-600">{certificateNumber}</p>
            </div>
          ) : result ? (
            <div className="mt-8 rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                  ✓
                </span>
                <p className="font-semibold text-green-900">Valid certificate</p>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Recipient</dt>
                  <dd className="font-medium text-slate-950">{result.recipientName}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Course</dt>
                  <dd className="font-medium text-slate-950">{result.courseTitle}</dd>
                </div>
                {result.courseCategory ? (
                  <div>
                    <dt className="text-slate-400">Category</dt>
                    <dd className="text-slate-700">{result.courseCategory}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-slate-400">Issued</dt>
                  <dd className="text-slate-700">
                    {formatCourseDate(result.issuedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Certificate number</dt>
                  <dd className="font-mono text-xs text-slate-600">
                    {result.certificateNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Verification ID</dt>
                  <dd className="font-mono text-xs text-slate-600">
                    {result.verificationHash}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
