import { redirect } from "next/navigation";

export default async function AdminUserDetailRedirect({
  params,
}: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  redirect(`/admin/users?user=${id}`);
}
