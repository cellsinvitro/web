import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | CellsInVitro",
  description:
    "Get in touch with CellsInVitro for research kit inquiries, collaborations, and scientific support.",
};

const contactDetails = [
  {
    label: "Email",
    value: "info@cellsinvitro.com",
    href: "mailto:info@cellsinvitro.com",
  },
  {
    label: "Website",
    value: "cellsinvitro.com",
    href: "https://cellsinvitro.com",
  },
];

export default function ContactPage() {
  return (
    <main>
      <Navbar />

      <section className="relative overflow-hidden bg-white pt-24 pb-16 sm:pb-20 lg:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-40 h-64 w-64 rounded-full border border-slate-200/70"
        />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:items-start">
            <aside className="space-y-8">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Contact Us
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Let&apos;s advance research
                  <span className="text-slate-500"> together.</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
                  Questions about research kits, collaborations, or scientific
                  support? Send us a message and our team will get back to you.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Direct channels
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Prefer email? Reach us directly — we typically respond within
                  one to two business days.
                </p>
              </div>

              <ul className="space-y-5">
                {contactDetails.map((item) => (
                  <li key={item.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <a
                      href={item.href}
                      {...(item.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="mt-1.5 inline-block text-base font-medium text-slate-900 transition-colors hover:text-slate-600"
                    >
                      {item.value}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Looking for kits?
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Explore our research-focused assay kits and find the right
                  solution for your lab.
                </p>
                <Link
                  href="/#kits"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition-colors hover:text-slate-700"
                >
                  View research kits
                  <span>→</span>
                </Link>
              </div>
            </aside>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Send a message
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Share a few details and we&apos;ll follow up shortly.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
