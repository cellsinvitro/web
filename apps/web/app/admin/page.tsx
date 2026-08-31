"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAdminStats } from "@/lib/api";
import type { AdminOverviewData } from "@/lib/api";
import { AdminSpinner } from "@/components/AdminLoader";

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatCurrency(amount?: number) {
  if (!amount || amount <= 0) return "₹0";
  const rupees = amount / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeColor = "emerald",
  href,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeColor?: "emerald" | "blue" | "purple" | "amber" | "rose" | "indigo";
  href?: string;
}) {
  const badgeClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    blue: "bg-blue-50 text-blue-700 border-blue-200/80",
    purple: "bg-purple-50 text-purple-700 border-purple-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  }[badgeColor];

  const CardContent = (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 truncate">
            {title}
          </span>
        </div>
        {badgeText ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${badgeClasses}`}
          >
            {badgeText}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{CardContent}</Link>;
  }

  return CardContent;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "resources" | "kits" | "courses" | "enrollments" | "payments"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminStats();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = data?.stats;
  const recent = data?.recent;
  const breakdowns = data?.breakdowns;

  // Filtered lists based on search query
  const filteredUsers = useMemo(() => {
    if (!recent?.users) return [];
    if (!searchQuery.trim()) return recent.users;
    const q = searchQuery.toLowerCase();
    return recent.users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q)
    );
  }, [recent?.users, searchQuery]);

  const filteredMaterials = useMemo(() => {
    if (!recent?.materials) return [];
    if (!searchQuery.trim()) return recent.materials;
    const q = searchQuery.toLowerCase();
    return recent.materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [recent?.materials, searchQuery]);

  const filteredKits = useMemo(() => {
    if (!recent?.kits) return [];
    if (!searchQuery.trim()) return recent.kits;
    const q = searchQuery.toLowerCase();
    return recent.kits.filter(
      (k) =>
        k.title.toLowerCase().includes(q) ||
        k.category.toLowerCase().includes(q) ||
        k.assays.some((a) => a.toLowerCase().includes(q))
    );
  }, [recent?.kits, searchQuery]);

  const filteredCourses = useMemo(() => {
    if (!recent?.courses) return [];
    if (!searchQuery.trim()) return recent.courses;
    const q = searchQuery.toLowerCase();
    return recent.courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [recent?.courses, searchQuery]);

  const filteredEnrollments = useMemo(() => {
    if (!recent?.enrollments) return [];
    if (!searchQuery.trim()) return recent.enrollments;
    const q = searchQuery.toLowerCase();
    return recent.enrollments.filter(
      (e) =>
        e.user.name?.toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        e.course?.title.toLowerCase().includes(q) ||
        e.package?.title.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)
    );
  }, [recent?.enrollments, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!recent?.payments) return [];
    if (!searchQuery.trim()) return recent.payments;
    const q = searchQuery.toLowerCase();
    return recent.payments.filter(
      (p) =>
        p.user.name?.toLowerCase().includes(q) ||
        p.user.email.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
    );
  }, [recent?.payments, searchQuery]);

  const exportSummaryJSON = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cellsinvitro-admin-summary-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-6 sm:px-8 sm:py-8">
      {/* Top Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Admin Command Center</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">Live Data</span>
          </div>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            Platform Master Data & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Comprehensive operational view of users, study materials, research kits, course modules, enrollments, and revenue metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin text-slate-500" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
          </button>

          <button
            onClick={exportSummaryJSON}
            disabled={!data}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Export Master Data</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Metric Cards Grid */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Users & Accounts"
          value={stats?.users?.total ?? stats?.totalUsers ?? 0}
          subtitle={`${stats?.users?.google ?? stats?.googleUsers ?? 0} Google · ${stats?.users?.email ?? stats?.emailUsers ?? 0} Email`}
          badgeText={`+${stats?.users?.recentSignups ?? stats?.recentSignups ?? 0} new`}
          badgeColor="indigo"
          href="/admin/users"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Library Storage"
          value={stats?.materials?.total ?? 0}
          subtitle={`${stats?.materials?.totalFiles ?? 0} files (${formatBytes(stats?.materials?.totalStorageBytes)})`}
          badgeText="Resources"
          badgeColor="purple"
          href="/admin/resources"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />

        <MetricCard
          title="Research Kits"
          value={stats?.kits?.total ?? 0}
          subtitle={`${stats?.kits?.published ?? 0} Published · ${stats?.kits?.draft ?? 0} Draft`}
          badgeText="Protocols"
          badgeColor="emerald"
          href="/admin/kits"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
        />

        <MetricCard
          title="Courses & Modules"
          value={stats?.courses?.total ?? 0}
          subtitle={`${stats?.courses?.totalModules ?? 0} Modules · ${stats?.packages?.total ?? 0} Bundles`}
          badgeText="Published"
          badgeColor="blue"
          href="/admin/courses"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />

        <MetricCard
          title="Enrollments & Certs"
          value={stats?.enrollments?.total ?? 0}
          subtitle={`${stats?.enrollments?.active ?? 0} Active · ${stats?.certificates?.total ?? 0} Certs`}
          badgeText="Progress"
          badgeColor="amber"
          href="/admin/certificates"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />

        <MetricCard
          title="Revenue & Billing"
          value={formatCurrency(stats?.payments?.totalRevenue ?? 0)}
          subtitle={`${stats?.payments?.completed ?? 0} Completed · ${stats?.payments?.pending ?? 0} Pending`}
          badgeText="Payments"
          badgeColor="rose"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Command Navigation & Search Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "users", label: `👥 Users (${filteredUsers.length})` },
            { id: "resources", label: `📚 Resources (${filteredMaterials.length})` },
            { id: "kits", label: `🧬 Kits (${filteredKits.length})` },
            { id: "courses", label: `🎓 Courses (${filteredCourses.length})` },
            { id: "enrollments", label: `📜 Enrollments (${filteredEnrollments.length})` },
            { id: "payments", label: `💳 Payments (${filteredPayments.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Filter Search Input */}
        <div className="relative shrink-0 sm:w-72">
          <input
            type="text"
            placeholder="Filter all data live..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 pl-9 text-xs text-slate-900 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <AdminSpinner size={36} />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Aggregating Master Data Across All Features...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Category & Breakdown Charts Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* User Designation Breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      User Member Roles & Designations
                    </h2>
                    <Link
                      href="/admin/users"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Manage Users →
                    </Link>
                  </div>
                  {breakdowns?.userDesignations && breakdowns.userDesignations.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {breakdowns.userDesignations.map((item) => (
                        <div
                          key={item.designation}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                            {item.designation.replace(/_/g, " ")}
                          </span>
                          <span className="mt-1 text-xl font-bold text-slate-900">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No designation breakdown registered yet.
                    </p>
                  )}
                </div>

                {/* Course Category Breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Course & Content Categories
                    </h2>
                    <Link
                      href="/admin/courses"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Manage Courses →
                    </Link>
                  </div>
                  {breakdowns?.courseCategories && breakdowns.courseCategories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {breakdowns.courseCategories.map((item) => (
                        <div
                          key={item.category}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                            {item.category}
                          </span>
                          <span className="mt-1 text-xl font-bold text-slate-900">
                            {item.count} courses
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No course categories created yet.
                    </p>
                  )}
                </div>

                {/* Research Kit Categories */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Research Kits Distribution
                    </h2>
                    <Link
                      href="/admin/kits"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Manage Kits →
                    </Link>
                  </div>
                  {breakdowns?.kitCategories && breakdowns.kitCategories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {breakdowns.kitCategories.map((item) => (
                        <div
                          key={item.category}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                            {item.category}
                          </span>
                          <span className="mt-1 text-xl font-bold text-slate-900">
                            {item.count} kits
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No kit categories defined yet.
                    </p>
                  )}
                </div>

                {/* Resource / Study Material Categories */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      Library Study Materials Categories
                    </h2>
                    <Link
                      href="/admin/resources"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      Manage Library →
                    </Link>
                  </div>
                  {breakdowns?.materialCategories && breakdowns.materialCategories.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {breakdowns.materialCategories.map((item) => (
                        <div
                          key={item.category}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                            {item.category}
                          </span>
                          <span className="mt-1 text-xl font-bold text-slate-900">
                            {item.count} items
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No study material categories created yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS DATA TABLE */}
          {activeTab === "users" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">Registered Platform Users</h3>
                  <p className="text-xs text-slate-500">
                    Showing latest registered user accounts and admin statuses
                  </p>
                </div>
                <Link
                  href="/admin/users"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Full User Admin →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">User / Email</th>
                      <th className="px-5 py-3">AuthProvider</th>
                      <th className="px-5 py-3">Designation</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                          No users matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{u.name || "Unnamed"}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                              {u.authProvider}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {u.designation ? u.designation.replace(/_/g, " ") : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                u.role === "ADMIN"
                                  ? "bg-slate-950 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {formatDate(u.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RESOURCES & LIBRARY */}
          {activeTab === "resources" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">Library & Study Materials</h3>
                  <p className="text-xs text-slate-500">
                    Uploaded research papers, guidebooks, and attachments
                  </p>
                </div>
                <Link
                  href="/admin/resources"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Manage Resources →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Resource Title</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Attached Files</th>
                      <th className="px-5 py-3">Total Size</th>
                      <th className="px-5 py-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                          No study resources matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((m) => {
                        const totalSize = m.files?.reduce((acc, f) => acc + f.fileSize, 0) || 0;
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900">{m.title}</div>
                              <div className="text-xs text-slate-500 truncate max-w-md">
                                {m.description || "No description provided"}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="rounded-md bg-purple-50 border border-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {m.category || "General"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              {m.files?.length || 0} file(s)
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono text-slate-600">
                              {formatBytes(totalSize)}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-500">
                              {formatDate(m.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RESEARCH KITS */}
          {activeTab === "kits" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">Research & Lab Kits Data</h3>
                  <p className="text-xs text-slate-500">
                    Assay configurations, lab protocol kits, and published statuses
                  </p>
                </div>
                <Link
                  href="/admin/kits"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Manage Kits →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Kit Title</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Featured Assays</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Updated Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                          No research kits matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredKits.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{k.title}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              {k.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {k.assays.slice(0, 3).map((assay, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                                >
                                  {assay}
                                </span>
                              ))}
                              {k.assays.length > 3 ? (
                                <span className="text-[10px] text-slate-400">
                                  +{k.assays.length - 3} more
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                k.published
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {k.published ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {formatDate(k.updatedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COURSES & PACKAGES */}
          {activeTab === "courses" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">Courses & Learning Modules</h3>
                  <p className="text-xs text-slate-500">
                    Active course catalog, module counts, pricing and enrollment totals
                  </p>
                </div>
                <Link
                  href="/admin/courses"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Manage Courses →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Course Title</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Modules</th>
                      <th className="px-5 py-3">Price</th>
                      <th className="px-5 py-3">Enrollments</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                          No courses matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">{c.title}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {c.category || "General"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {c.modules?.length || 0} modules
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-900">
                            {c.price === 0 ? "Free" : formatCurrency(c.price)}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">
                            {c._count?.enrollments ?? 0} students
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                c.published
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {c.published ? "Published" : "Draft"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ENROLLMENTS & CERTIFICATES */}
          {activeTab === "enrollments" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">User Course Enrollments</h3>
                  <p className="text-xs text-slate-500">
                    Live record of student enrollments and certificates issued
                  </p>
                </div>
                <Link
                  href="/admin/certificates"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  View Certificates →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Student Name / Email</th>
                      <th className="px-5 py-3">Enrolled Item</th>
                      <th className="px-5 py-3">Enrollment Status</th>
                      <th className="px-5 py-3">Purchased Date</th>
                      <th className="px-5 py-3">Expires Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                          No enrollments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">
                              {e.user.name || "Student"}
                            </div>
                            <div className="text-xs text-slate-500">{e.user.email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-slate-800">
                            {e.course?.title || e.package?.title || "Unknown Course"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                e.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : e.status === "COMPLETED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {e.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {formatDate(e.purchasedAt)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {formatDate(e.expiresAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: PAYMENTS LOG */}
          {activeTab === "payments" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-900">Financial Payment Audit Log</h3>
                  <p className="text-xs text-slate-500">
                    Razorpay and manual course transaction records
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Transaction / User</th>
                      <th className="px-5 py-3">Item Purchased</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Provider</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                          No payment transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">
                              {p.user.name || p.user.email}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">{p.id}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-700">
                            {p.course?.title || p.package?.title || "Direct Enrollment"}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-xs uppercase tracking-wider text-slate-600">
                            {p.provider}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                p.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {formatDate(p.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
