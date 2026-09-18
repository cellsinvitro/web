import { FormSkeleton } from "@/components/skeletons/Skeletons";

export default function LoginLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <FormSkeleton fields={2} />
    </div>
  );
}
