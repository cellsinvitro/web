import { TableSkeleton } from "@/components/skeletons/Skeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
