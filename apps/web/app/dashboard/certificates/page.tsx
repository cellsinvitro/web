"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyCertificates, type Certificate } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";

export default function DashboardCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCertificates()
      .then(setCertificates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
        Achievements
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        My certificates
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Verifiable certificates for completed courses.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : certificates.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">No certificates yet.</p>
          <Link href="/dashboard/courses" className="mt-2 text-sm font-medium hover:underline">
            Continue your courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="font-semibold text-slate-950">{cert.course.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                Issued {formatCourseDate(cert.issuedAt)}
              </p>
              <p className="mt-2 text-xs font-mono text-slate-600">
                {cert.certificateNumber}
              </p>
              <Link
                href={`/verify/${cert.certificateNumber}`}
                className="mt-3 inline-flex text-sm font-medium text-slate-950 hover:underline"
              >
                Verify certificate
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
