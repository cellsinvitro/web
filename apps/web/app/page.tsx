import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ResearchKits from "@/components/ResearchKits";
import Features from "@/components/Features";
import Statistics from "@/components/Statistics";
import Testimonials from "@/components/Testimonials";
import Team from "@/components/Team";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import PageLoader from "@/components/PageLoader";

export default function Home() {
  return (
    <main>
      <PageLoader />
      <Navbar />
      <Hero />
      <ResearchKits />
      <Features />
      <Statistics />
      <Testimonials />
      <Team />
      <CTA />
      <Footer />
      {/* More sections will be added here */}
    </main>
  );
}