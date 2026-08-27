"use client";

import { use } from "react";
import AdminCourseDetailView from "@/components/admin/AdminCourseDetailView";

export default function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <AdminCourseDetailView courseId={id} />
    </div>
  );
}
