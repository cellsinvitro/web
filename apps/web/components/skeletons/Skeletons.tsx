import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * TableSkeleton - Renders table rows with header and animated data cells
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3.5">
                  <Skeleton className="h-4 w-20 bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rIndex) => (
              <tr key={rIndex} className="animate-pulse">
                {Array.from({ length: columns }).map((_, cIndex) => (
                  <td key={cIndex} className="px-4 py-4">
                    {cIndex === 0 ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ) : cIndex === columns - 1 ? (
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    ) : (
                      <Skeleton
                        className={`h-4 ${
                          cIndex % 2 === 0 ? "w-24" : "w-16"
                        }`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * CardSkeleton - Single item card skeleton (Course, Kit, Resource, Tool)
 */
export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * CardGridSkeleton - Responsive grid of card skeletons
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * MetricsSkeleton - Metric/stat widgets grid skeleton for dashboards & admin
 */
export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DetailSkeleton - Detail page skeleton layout (Left media, right metadata & CTA)
 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header breadcrumb & title skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column - main content */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>

        {/* Right column - sidebar pricing & actions */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FormSkeleton - Form input fields & button placeholder
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="mt-6 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton - Full Dashboard layout loading placeholder
 */
export function DashboardSkeleton() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Metrics Grid */}
      <MetricsSkeleton count={4} />

      {/* Main Content / Table */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}

/**
 * AdminSkeleton - Full Admin Panel loading placeholder
 */
export function AdminSkeleton() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-8">
      {/* Admin Title Header */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Admin Stats */}
      <MetricsSkeleton count={4} />

      {/* Management Table */}
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}

/**
 * LogbookSkeleton - Specialized layout loader for Lab Logbook
 */
export function LogbookSkeleton() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-6">
      <div className="flex gap-3 border-b border-slate-200 pb-4">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * CryoSearchSkeleton - Search input, filter panel and research grid loader
 */
export function CryoSearchSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="space-y-4 text-center">
        <Skeleton className="mx-auto h-9 w-64" />
        <Skeleton className="mx-auto h-4 w-96" />
        <Skeleton className="mx-auto h-12 w-full max-w-2xl rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-3 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
