import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ResearchKits from "@/components/ResearchKits";
import Features from "@/components/Features";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ResearchKits />
      <Features />
      {/* More sections will be added here */}
    </main>
  );
}