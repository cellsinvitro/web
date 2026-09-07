  import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us | CellsInVitro",
  description:
    "Learn about CellsInVitro's mission, team, and commitment to advancing cellular research.",
};

const aboutContent = [
  {
    id: "mission",
    title: "Our Mission",
    text:
      "To accelerate scientific discovery by providing high-quality research kits, reagents, and tools that empower researchers worldwide. We strive to make cellular research more accessible, reliable, and impactful.",
  },
  {
    id: "team",
    title: "Our Team",
    text:
      "Led by a team of scientists and innovators, we combine deep biological expertise with cutting-edge technology to deliver products that meet the highest standards of quality and performance.",
  },
  {
    id: "values",
    title: "Our Values",
    text:
      "Quality, innovation, and customer success drive everything we do. We are committed to transparency, ethical practices, and continuous improvement in service of the research community.",
  },
];

export default function AboutPage() {
  return (
    <main>
      <Navbar />

      <section
        id="about"
        className="bg-white relative overflow-hidden pt-24 sm:pt-32 pb-16 lg:pb-24"
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-10 mt-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:items-start">
            <aside className="space-y-8">
              {aboutContent.map((section) => (
                <div key={section.id} className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {section.title}
                  </p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    {section.title.split(" ")[0]}
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
                    {section.text}
                  </p>
                </div>
              ))}
            </aside>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                About CellsInVitro
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                CellsInVitro is dedicated to advancing cellular research through
                innovative solutions and comprehensive support for the scientific
                community.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}