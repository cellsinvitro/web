import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResearchKits from "@/components/ResearchKits";

export const metadata: Metadata = {
  title: "Research Kits | CellsInVitro",
  description:
    "Explore our assay-based research kits developed for cellular, antioxidant, and metabolic research applications. No sign-up required.",
};

export default function KitsPage() {
  return (
    <main>
      <Navbar />
      <ResearchKits standalone />
      <Footer />
    </main>
  );
}
