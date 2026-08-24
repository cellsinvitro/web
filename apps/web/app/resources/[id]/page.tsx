import type { Metadata } from "next";
import ResourceDetailPageClient from "./ResourceDetailPageClient";

export const metadata: Metadata = {
  title: "Resource | CellsInVitro",
  description: "View study material in the CellsInVitro Resource Library.",
};

export default function ResourceDetailPage() {
  return <ResourceDetailPageClient />;
}
