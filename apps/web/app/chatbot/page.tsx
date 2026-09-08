import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BioChemChatbot from "@/components/BioChemChatbot";

export const metadata: Metadata = {
  title: "BioChem AI Chatbot | CellsInVitro",
  description:
    "Ask any question related to Chemistry and Biology. Powered by Groq AI for fast, accurate scientific answers.",
};

const TOPICS = [
  {
    title: "Organic & Inorganic Chemistry",
    desc: "Reaction mechanisms, functional groups, stoichiometry, molecular geometry.",
    icon: (
      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.18.106l-1.5 1.5a2 2 0 000 2.828l1.5 1.5a2 2 0 002.828 0l1.5-1.5a2 2 0 00.106-1.18l-.477-2.387a6 6 0 01.517-3.86l.158-.318a6 6 0 00.517-3.86L8.88 5.6a2 2 0 00-.106-1.18l-1.5-1.5a2 2 0 00-2.828 0l-1.5 1.5a2 2 0 000 2.828l1.5 1.5" />
      </svg>
    ),
  },
  {
    title: "Cell Biology & Genetics",
    desc: "DNA replication, transcription, organelle function, mitosis, gene expression.",
    icon: (
      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    title: "Biochemistry & Metabolism",
    desc: "Krebs cycle, glycolysis, enzyme kinetics, protein folding, ATP synthesis.",
    icon: (
      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Lab Math & Calculations",
    desc: "Molarity, dilution factors (C1V1 = C2V2), pH/pKa, buffer formulation.",
    icon: (
      <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function ChatbotPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex-1">
        {/* Eyebrow & Hero Title matching CellsInVitro */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              AI Science Assistant
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            BioChem <span className="text-slate-500">AI Assistant</span>
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Your specialized AI tutor exclusively focused on Chemistry & Biology. Ask questions about chemical reactions, cellular mechanisms, genetics, or lab calculations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Info Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
                Coverage
              </p>
              <h2 className="text-lg font-bold text-slate-950 mb-3">
                Supported Science Domains
              </h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                BioChem AI is configured with strict guardrails to answer only Chemistry and Biology queries.
              </p>

              <div className="space-y-3">
                {TOPICS.map((topic, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shrink-0">
                      {topic.icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-950">
                        {topic.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        {topic.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 text-white p-6 rounded-[2rem] shadow-sm border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400 text-sm">⚡</span>
                <h3 className="font-semibold text-sm text-white">Groq AI Engine</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Leverages ultra-fast Groq Llama-3 models for instant, high-speed scientific answers and lab calculations.
              </p>
            </div>
          </div>

          {/* Main Embedded Chat Component */}
          <div className="lg:col-span-8 flex justify-center">
            <BioChemChatbot embedded={true} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
