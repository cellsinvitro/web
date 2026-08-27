"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminCertificates } from "@/lib/api";
import { formatCourseDate } from "@/lib/courses";
import AdminLoader from "@/components/AdminLoader";

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<
    Awaited<ReturnType<typeof fetchAdminCertificates>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminCertificates()
      .then(setCertificates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <Link href="/admin/courses" className="text-sm text-slate-500 hover:text-slate-950">
        ← Courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-950">Certificates</h1>

      {loading ? (
        <AdminLoader label="Loading certificates…" />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Issued</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{cert.certificateNumber}</td>
                  <td className="px-4 py-3">
                    {cert.user.name || cert.user.email}
                  </td>
                  <td className="px-4 py-3">{cert.course.title}</td>
                  <td className="px-4 py-3">{formatCourseDate(cert.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
