import { FormSkeleton } from "@/components/skeletons/Skeletons";

export default function RegisterLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <FormSkeleton fields={4} />
    </div>
  );
}
