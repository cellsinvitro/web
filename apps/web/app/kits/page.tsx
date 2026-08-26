import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ResearchKits from "@/components/ResearchKits";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Research Kits | CellsInVitro",
  description:
    "Explore assay-based research kits for cellular, antioxidant, and metabolic research — including anti-cancer, anti-oxidant, and anti-diabetic assay kits.",
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
