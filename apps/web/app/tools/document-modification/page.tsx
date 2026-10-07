import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocumentModificationTool from "@/components/DocumentServices/DocumentModificationTool";
import BeforeAfterShowcase from "@/components/DocumentServices/BeforeAfterShowcase";
import SampleGuidelinesCard from "@/components/DocumentServices/SampleGuidelinesCard";
import InquirySampleForm from "@/components/DocumentServices/InquirySampleForm";

export const metadata: Metadata = {
  title: "Document Modification & Proofreading Services | CellsInVitro",
  description:
    "Confidential, high-precision document editing, grammar correction, formatting, and citation standardizing. Instant auto-detected word count pricing.",
};

export default function DocumentModificationPage() {
  return (
    <main className="min-h-screen bg-slate-50/50">
      <Navbar />

      <div className="pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main 2-Column Hero & Calculator Section */}
          <DocumentModificationTool />

          {/* Sample Work Before & After Showcase */}
          <BeforeAfterShowcase />

          {/* Rules & Template Download Section */}
          <SampleGuidelinesCard />

          {/* Inquiry & ₹100 Sample Page Form */}
          <InquirySampleForm />
        </div>
      </div>

      <Footer />
    </main>
  );
}
