import { redirect } from "next/navigation";

export default function StockIndexPage() {
  redirect("/cyrosearch?tab=stock");
}
