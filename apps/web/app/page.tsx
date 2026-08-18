import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />

      {/* Sections will be added here */}
      <section id="kits" className="min-h-screen bg-white" />
      <section id="features" className="min-h-screen bg-slate-50" />
      <section id="team" className="min-h-screen bg-white" />
      <section id="contact" className="min-h-screen bg-slate-50" />
    </main>
  );
}