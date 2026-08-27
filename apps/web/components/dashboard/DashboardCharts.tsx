"use client";

import type { Enrollment } from "@/lib/api";

const CHART_COLORS = {
  completed: "#16a34a",
  active: "#0f172a",
  expired: "#dc2626",
  idle: "#e2e8f0",
} as const;

type Segment = {
  label: string;
  value: number;
  color: string;
};

function DonutChart({
  segments,
  size = 140,
  stroke = 14,
}: {
  segments: Segment[];
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={CHART_COLORS.idle}
          strokeWidth={stroke}
        />
      </svg>
    );
  }

  let offset = 0;

  return (
    <svg width={size} height={size} aria-hidden>
      {segments.map((segment) => {
        if (segment.value === 0) return null;

        const dash = (segment.value / total) * circumference;
        const element = (
          <circle
            key={segment.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );

        offset += dash;
        return element;
      })}
    </svg>
  );
}

function ProgressRing({
  value,
  size = 120,
  stroke = 10,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#0f172a"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function LearningStatusChart({ enrollments }: { enrollments: Enrollment[] }) {
  const completed = enrollments.filter((e) => e.status === "COMPLETED").length;
  const expired = enrollments.filter((e) => e.status === "EXPIRED").length;
  const active = enrollments.filter(
    (e) => e.status === "ACTIVE" && e.progressPercent > 0,
  ).length;
  const notStarted = enrollments.filter(
    (e) => e.status === "ACTIVE" && e.progressPercent === 0,
  ).length;

  const segments: Segment[] = [
    { label: "Completed", value: completed, color: CHART_COLORS.completed },
    { label: "In progress", value: active, color: CHART_COLORS.active },
    { label: "Not started", value: notStarted, color: CHART_COLORS.idle },
    { label: "Expired", value: expired, color: CHART_COLORS.expired },
  ].filter((segment) => segment.value > 0);

  const total = enrollments.length;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <DonutChart segments={segments} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-slate-950">{total}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Courses
          </p>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {[
          { label: "Completed", value: completed, color: CHART_COLORS.completed },
          { label: "In progress", value: active, color: CHART_COLORS.active },
          { label: "Not started", value: notStarted, color: CHART_COLORS.idle },
          { label: "Expired", value: expired, color: CHART_COLORS.expired },
        ].map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-950">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverallProgressChart({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ProgressRing value={value} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold text-slate-950">{value}%</p>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function CourseProgressBars({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Enroll in a course to track your learning progress here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.slice(0, 4).map((enrollment) => (
        <div key={enrollment.id}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-slate-800">
              {enrollment.course.title}
            </p>
            <span className="shrink-0 text-sm font-semibold text-slate-950">
              {enrollment.progressPercent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-950 transition-all"
              style={{ width: `${enrollment.progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {enrollment.completedModules}/{enrollment.totalModules} modules complete
          </p>
        </div>
      ))}
    </div>
  );
}

export function LibraryBreakdownChart({
  resourceCount,
  kitCount,
  certificateCount,
}: {
  resourceCount: number;
  kitCount: number;
  certificateCount: number;
}) {
  const items = [
    { label: "Resources", value: resourceCount, color: "#0f172a" },
    { label: "Research kits", value: kitCount, color: "#64748b" },
    { label: "Certificates", value: certificateCount, color: "#16a34a" },
  ];

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-950">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
