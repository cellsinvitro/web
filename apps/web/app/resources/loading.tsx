import { CardGridSkeleton } from "@/components/skeletons/Skeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ResourcesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
