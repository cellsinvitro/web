import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LmsPageShell from "@/components/LMS/LmsPageShell";
import GlobalLoader from "@/components/GlobalLoader";

export const metadata: Metadata = {
  title: "Lab Management Suite (LMS) | CellsInVitro",
  description:
    "CellsInVitro Lab Management Suite: CryoSearch 2D cell banking repository, stock inventory management, electronic lab logbook, and research budget tracking.",
};

export default function LmsPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 flex flex-col">
      <Navbar />
      <Suspense fallback={<GlobalLoader fullScreen={false} sublabel="Loading Lab Management Suite..." />}>
        <LmsPageShell />
      </Suspense>
      <Footer />
    </main>
  );
}
