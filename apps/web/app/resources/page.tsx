import type { Metadata } from "next";
import ResourcesPageClient from "./ResourcesPageClient";

export const metadata: Metadata = {
  title: "Resource Library | CellsInVitro",
  description:
    "Browse study materials, protocols, and reference documents curated by the CellsInVitro team.",
};

export default function ResourcesPage() {
  return <ResourcesPageClient />;
}
