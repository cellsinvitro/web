import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | CellsInVitro",
  description: "Terms governing use of the CellsInVitro website and services.",
};

const sections = [
  {
    title: "Acceptance of these terms",
    text: "These Terms & Conditions govern your access to and use of the CellsInVitro website, accounts, research resources, courses, and research kit services. By using the website or placing an order, you agree to these terms. If you do not agree, please do not use the services.",
  },
  {
    title: "Accounts and acceptable use",
    text: "You must provide accurate account information, keep your credentials secure, and use the services lawfully. You may not attempt to access another user’s account, disrupt the website, upload malicious content, misuse downloadable materials, or use the services to violate applicable laws or another person’s rights.",
  },
  {
    title: "Research kits and research use only",
    text: "CellsInVitro research kits are intended for research use only unless product documentation expressly states otherwise. They are not intended for human or veterinary diagnostic, therapeutic, food, cosmetic, or household use. You are responsible for determining whether a product is suitable for your intended application and for following all applicable laboratory, safety, storage, and disposal requirements.",
  },
  {
    title: "Orders, pricing, and availability",
    text: "Product descriptions, prices, stock information, and availability may change without notice. An order is subject to acceptance and availability. We may correct pricing or listing errors and may contact you before fulfilling an affected order. Applicable taxes, delivery charges, and other checkout terms will be shown where relevant.",
  },
  {
    title: "Courses and digital resources",
    text: "Courses, protocols, documents, and other digital resources are provided for individual research or educational use. You may not copy, resell, redistribute, publish, or commercially exploit them without written permission. Access may be limited, suspended, or withdrawn if these terms are violated.",
  },
  {
    title: "Intellectual property",
    text: "The CellsInVitro name, branding, website design, software, text, images, product content, and other materials are owned by CellsInVitro or its licensors. Except for the limited use expressly allowed through the services, no rights are transferred to you.",
  },
  {
    title: "Disclaimers and liability",
    text: "The services and informational content are provided on an availability basis. To the extent permitted by law, CellsInVitro does not guarantee uninterrupted operation, error-free content, or that a product will meet every application or result expectation. Nothing in these terms limits rights or liability that cannot legally be excluded.",
  },
  {
    title: "Changes and contact",
    text: "We may update these terms when our services, practices, or legal requirements change. Continued use after an update means you accept the revised terms. Questions about these terms can be sent to cellsinvitro@gmail.com.",
  },
];

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <section className="bg-white pb-20 pt-28 sm:pb-24 sm:pt-36">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="border-b border-slate-200 pb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Legal</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Terms &amp; Conditions</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">The rules for using CellsInVitro services, accessing research content, and ordering research kits.</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Effective September 8, 2026</p>
          </header>
          <div className="divide-y divide-slate-200">
            {sections.map((section) => <section key={section.title} className="py-8"><h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p></section>)}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}