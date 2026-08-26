import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResourceDetailRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/dashboard/resources/${id}`);
}
