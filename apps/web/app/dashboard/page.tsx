"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  fetchKits,
  fetchMyCertificates,
  fetchMyEnrollments,
  fetchStudyMaterials,
  type Enrollment,
  type StudyMaterial,
} from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { formatCourseDate } from "@/lib/courses";
import {
  formatResourceDate,
  getMaterialFileCountLabel,
  getMaterialTypeSummary,
} from "@/lib/resources";
import EnrolledCoursesList from "@/components/dashboard/EnrolledCoursesList";
import {
  CourseProgressBars,
  LearningStatusChart,
  LibraryBreakdownChart,
  OverallProgressChart,
} from "@/components/dashboard/DashboardCharts";

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </>
  );

  const className =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300";

  if (href) {
    return (
      <Link href={href} className={`block ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-white"
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

function ResourceRow({ material }: { material: StudyMaterial }) {
  return (
    <Link
      href={`/dashboard/resources/${material.id}`}
      className="flex items-start justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-950">{material.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {getMaterialTypeSummary(material.files)}
          {material.category ? ` · ${material.category}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-slate-400">
          {formatResourceDate(material.createdAt)}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-600">
          {getMaterialFileCountLabel(material.files.length)}
        </p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [resourceCount, setResourceCount] = useState<number | null>(null);
  const [recentMaterials, setRecentMaterials] = useState<StudyMaterial[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificateCount, setCertificateCount] = useState<number | null>(null);
  const [kitCount, setKitCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStudyMaterials()
        .then((materials) => {
          setResourceCount(materials.length);
          setRecentMaterials(materials.slice(0, 4));
        })
        .catch(() => {
          setResourceCount(0);
          setRecentMaterials([]);
        }),
      fetchMyEnrollments()
        .then(setEnrollments)
        .catch(() => setEnrollments([])),
      fetchMyCertificates()
        .then((certs) => setCertificateCount(certs.length))
        .catch(() => setCertificateCount(0)),
      fetchKits()
        .then((kits) => setKitCount(kits.length))
        .catch(() => setKitCount(0)),
    ]).finally(() => setLoading(false));
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "there";
  const initials = user ? getInitials(user.name, user.email) : "";

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "ACTIVE"),
    [enrollments],
  );

  const inProgressEnrollment = useMemo(
    () =>
      activeEnrollments.find(
        (e) => e.progressPercent > 0 && e.progressPercent < 100,
      ) ?? activeEnrollments[0],
    [activeEnrollments],
  );

  const avgProgress = useMemo(() => {
    if (enrollments.length === 0) return 0;
    const total = enrollments.reduce((sum, e) => sum + e.progressPercent, 0);
    return Math.round(total / enrollments.length);
  }, [enrollments]);

  const completedCount = enrollments.filter((e) => e.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name || user.email}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-4 ring-white"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white ring-4 ring-white">
                {initials}
              </span>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Dashboard overview
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {user?.createdAt ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Member since {formatResourceDate(user.createdAt)}
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {user?.role === "ADMIN" ? "Administrator" : "Member"}
                </span>
                {certificateCount ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    {certificateCount} certificate{certificateCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {inProgressEnrollment ? (
            <Link
              href={`/dashboard/courses/${inProgressEnrollment.course.id}`}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-white transition-colors hover:bg-slate-800 lg:max-w-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Continue learning
              </p>
              <p className="mt-1 text-sm font-semibold">
                {inProgressEnrollment.course.title}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${inProgressEnrollment.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300">
                  {inProgressEnrollment.progressPercent}%
                </span>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-4 lg:max-w-sm">
              <p className="text-sm font-medium text-slate-950">Ready to begin?</p>
              <p className="mt-1 text-sm text-slate-500">
                Browse courses and start building your learning path.
              </p>
              <Link
                href="/courses"
                className="mt-3 inline-flex text-sm font-semibold text-slate-950 hover:underline"
              >
                Explore courses →
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enrolled courses"
          value={loading ? "—" : enrollments.length}
          hint={
            activeEnrollments.length > 0
              ? `${activeEnrollments.length} currently active`
              : "No active enrollments"
          }
          href="/dashboard/courses"
        />
        <StatCard
          label="Average progress"
          value={loading ? "—" : `${avgProgress}%`}
          hint={
            enrollments.length > 0
              ? "Across all enrolled courses"
              : "Start a course to track progress"
          }
        />
        <StatCard
          label="Certificates earned"
          value={loading ? "—" : (certificateCount ?? 0)}
          hint={`${completedCount} course${completedCount === 1 ? "" : "s"} completed`}
          href="/dashboard/certificates"
        />
        <StatCard
          label="Library items"
          value={
            loading
              ? "—"
              : (resourceCount ?? 0) + (kitCount ?? 0)
          }
          hint={`${resourceCount ?? 0} resources · ${kitCount ?? 0} kits`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Learning analytics"
            description="Track course status and progress across your enrollments."
          >
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Course status
                </p>
                <LearningStatusChart enrollments={enrollments} />
              </div>
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Overall completion
                </p>
                <OverallProgressChart
                  value={avgProgress}
                  label="Average progress across all courses"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Course progress"
            description="Module completion for your enrolled courses."
            action={
              <Link
                href="/dashboard/courses"
                className="text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                View all
              </Link>
            }
          >
            <CourseProgressBars enrollments={enrollments} />
          </SectionCard>

          <SectionCard
            title="My courses"
            description="Recently enrolled courses and current status."
            action={
              <Link
                href="/dashboard/courses"
                className="text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                View all
              </Link>
            }
          >
            <EnrolledCoursesList limit={2} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Platform overview"
            description="What is available across your dashboard."
          >
            <LibraryBreakdownChart
              resourceCount={resourceCount ?? 0}
              kitCount={kitCount ?? 0}
              certificateCount={certificateCount ?? 0}
            />
          </SectionCard>

          <SectionCard
            title="Recent resources"
            description="Latest study materials in the library."
            action={
              <Link
                href="/dashboard/resources"
                className="text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                View all
              </Link>
            }
          >
            {recentMaterials.length === 0 ? (
              <p className="text-sm text-slate-500">
                No study materials have been published yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentMaterials.map((material) => (
                  <ResourceRow key={material.id} material={material} />
                ))}
              </div>
            )}
          </SectionCard>

          {activeEnrollments.length > 0 ? (
            <SectionCard
              title="Upcoming expirations"
              description="Active courses sorted by access deadline."
            >
              <ul className="space-y-3">
                {activeEnrollments.slice(0, 3).map((enrollment) => (
                  <li key={enrollment.id}>
                    <Link
                      href={`/dashboard/courses/${enrollment.course.id}`}
                      className="block rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {enrollment.course.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Expires {formatCourseDate(enrollment.expiresAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
