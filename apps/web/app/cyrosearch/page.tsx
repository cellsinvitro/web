import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";
import CryoSearchApp from "@/components/cryosearch/CryoSearchApp";

export const metadata: Metadata = {
  title: "CryoSearch | CellsInVitro Cell Banking Repository",
  description:
    "Smart cryopreservation inventory and 2D grid repository for cell lines, cryovials, dewars, and bench solution calculations.",
};

export default function CyroSearchPage() {
  return (
    <main className="cryosearch-theme min-h-screen overflow-x-hidden bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 pt-24 sm:pt-28">
        <AuthGuard>
          <CryoSearchApp />
        </AuthGuard>
      </div>
      <Footer />
    </main>
  );
}
