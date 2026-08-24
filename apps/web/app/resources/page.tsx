import { redirect } from "next/navigation";

export default function ResourcesRedirectPage() {
  redirect("/login?redirect=/dashboard/resources");
}
