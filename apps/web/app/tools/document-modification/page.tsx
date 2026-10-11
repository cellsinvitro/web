import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DocServicesPoster from "@/components/DocumentServices/DocServicesPoster";
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

      {/* Hero Poster Banner on Top */}
      <DocServicesPoster />

      {/* Services and Interactive Tooling Section on Scroll */}
      <div id="services-section" className="scroll-mt-24 pt-12 pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Divider & Intro */}
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              ⚡ Instant Quote & Automated Word Count Detection
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Select Your Service & Upload Manuscript
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Upload your document in .doc or .docx format. Our engine automatically calculates the exact word count and renders your upfront price.
            </p>
          </div>

          {/* Main 2-Column Hero & Calculator Section */}
          <DocumentModificationTool />

          {/* Sample Work Before & After Showcase */}
          <div id="before-after" className="scroll-mt-28">
            <BeforeAfterShowcase />
          </div>

          {/* Rules & Template Download Section */}
          <div id="guidelines" className="scroll-mt-28">
            <SampleGuidelinesCard />
          </div>

          {/* Inquiry & ₹100 Sample Page Form */}
          <div id="inquiry-sample" className="scroll-mt-28">
            <InquirySampleForm />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

