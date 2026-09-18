import { CardGridSkeleton } from "@/components/skeletons/Skeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardCoursesLoading() {
  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-40" />
      </div>
      <CardGridSkeleton count={4} />
    </div>
  );
}
