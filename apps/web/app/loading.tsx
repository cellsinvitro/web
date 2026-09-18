import { CardGridSkeleton } from "@/components/skeletons/Skeletons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-4 text-center py-10">
        <Skeleton className="mx-auto h-10 w-3/4 max-w-xl" />
        <Skeleton className="mx-auto h-5 w-2/3 max-w-md" />
        <div className="flex justify-center gap-4 pt-4">
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
