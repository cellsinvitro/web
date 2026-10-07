"use client";

import { useState, ChangeEvent } from "react";
import PaymentModal from "./PaymentModal";

export default function InquirySampleForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Checkbox for 1-Page Sample Edit at ₹100
  const [isSamplePageRequested, setIsSamplePageRequested] = useState(false);

  // Payment modal trigger
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isSubmittedFree, setIsSubmittedFree] = useState(false);
  const [isSendingFree, setIsSendingFree] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSamplePageRequested) {
      // Open ₹100 payment modal
      setIsPaymentOpen(true);
    } else {
      // Free inquiry submission
      setIsSendingFree(true);
      setTimeout(() => {
        setIsSendingFree(false);
        setIsSubmittedFree(true);
      }, 1000);
    }
  };

  return (
    <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Info Column */}
        <div className="lg:col-span-5 space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
            💬 Have Questions or Want a Trial Edit?
          </span>

          <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Custom Inquiry & ₹100 Sample Edit Request
          </h3>

          <p className="text-sm leading-relaxed text-slate-600">
            Not ready for a full manuscript order? Send us your specific questions, or request a <strong>1-page sample edit for just ₹100</strong> to evaluate our quality before committing.
          </p>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold text-sm">✉️</span>
              <div>
                <p className="font-bold text-slate-900">Free Inquiry Reply</p>
                <p className="text-slate-500">Uncheck the ₹100 box to send general questions. Our team will reply via email within 2-4 hours.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
              <span className="text-emerald-600 font-bold text-sm">🧪</span>
              <div>
                <p className="font-bold text-slate-900">₹100 Sample Page Trial</p>
                <p className="text-slate-500">Check the ₹100 box, attach 1 page of your manuscript, and complete payment to receive an edited 250-word sample with track changes within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7">
          {!isSubmittedFree ? (
            <form onSubmit={handleFormSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Anita Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="anita@research-inst.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Turnaround time for 10,000 words thesis"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Message / Details *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your document requirement or any specific questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Optional File Attachment */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Attach Sample Document <span className="text-slate-400 font-normal">(Optional for inquiry • Required for ₹100 sample edit)</span>
                </label>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                />
              </div>

              {/* Checkbox for ₹100 Sample Page Request */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSamplePageRequested}
                    onChange={(e) => setIsSamplePageRequested(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      Request 1-Page Sample Edit (₹100/-)
                    </span>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      Check this option to enable instant ₹100 payment. Our senior editor will modify 1 sample page (up to 300 words) and send it back to your email within 24 hours.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSendingFree}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white transition-all shadow-md active:scale-95 ${
                  isSamplePageRequested
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSendingFree ? (
                  <span>Sending Inquiry...</span>
                ) : isSamplePageRequested ? (
                  <span>Pay ₹100 for 1-Page Sample Edit →</span>
                ) : (
                  <span>Submit Free Inquiry</span>
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold">
                ✓
              </div>
              <h4 className="text-xl font-bold text-slate-900">Inquiry Received!</h4>
              <p className="text-xs text-slate-600">
                Thank you, <strong>{name}</strong>. We have received your message and will reply to <strong>{email}</strong> shortly.
              </p>
              <button
                onClick={() => {
                  setIsSubmittedFree(false);
                  setMessage("");
                  setSubject("");
                }}
                className="mt-2 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Send Another Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ₹100 Sample Page Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        serviceTitle="1-Page Sample Edit Trial"
        quantity={1}
        unitLabel="sample page"
        unitPrice={100}
        totalPrice={100}
        uploadedFileName={attachedFile?.name || "Sample_Page_Draft.docx"}
      />
    </section>
  );
}
