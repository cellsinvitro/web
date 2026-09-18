import { FormSkeleton } from "@/components/skeletons/Skeletons";

export default function ContactLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <FormSkeleton fields={4} />
    </div>
  );
}
