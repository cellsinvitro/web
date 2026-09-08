import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | CellsInVitro",
  description: "Learn how CellsInVitro collects, uses, and protects information.",
};

const sections = [
  {
    title: "Information we collect",
    paragraphs: [
      "We collect information you provide when you create an account, contact us, enroll in learning content, request support, or purchase a research kit. This may include your name, email address, contact details, professional information, order details, and messages you send us.",
      "We also receive technical information needed to operate the website, such as browser details, device information, approximate location, and pages or features you use.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "CellsInVitro uses information to provide and improve our research kits, resources, courses, account features, orders, and support services. We may also use it to authenticate users, maintain security, communicate service updates, process payments, and meet legal obligations.",
      "We do not sell personal information. We share information only with service providers who help us operate the platform, process payments, deliver communications, store files, or provide other services on our behalf, and only as reasonably necessary for those purposes.",
    ],
  },
  {
    title: "Accounts and security",
    paragraphs: [
      "You are responsible for keeping your account credentials confidential and for notifying us if you believe your account has been accessed without permission. We use reasonable administrative, technical, and organizational safeguards, but no online service can guarantee absolute security.",
      "You may request access to, correction of, or deletion of personal information associated with your account, subject to records we must retain for legal, security, or transaction purposes.",
    ],
  },
  {
    title: "Cookies and preferences",
    paragraphs: [
      "We may use cookies and similar technologies to keep you signed in, remember preferences, understand site usage, and improve performance. You can control cookies through your browser, although disabling necessary cookies may affect account features.",
    ],
  },
  {
    title: "Research-use content",
    paragraphs: [
      "Information and materials on CellsInVitro are provided for research and educational purposes. They are not medical advice, diagnostic advice, or a substitute for professional judgment. Please review product documentation and applicable safety information before use.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may update this policy as our services or legal requirements change. The updated version will be posted on this page with a revised effective date. For privacy questions or requests, contact us at info@cellsinvitro.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <section className="bg-white pb-20 pt-28 sm:pb-24 sm:pt-36">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="border-b border-slate-200 pb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Legal</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Privacy Policy</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">How CellsInVitro handles information across our website, accounts, research resources, courses, and kit services.</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Effective September 8, 2026</p>
          </header>
          <div className="divide-y divide-slate-200">
            {sections.map((section) => <section key={section.title} className="py-8"><h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">{paragraph}</p>)}</section>)}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}