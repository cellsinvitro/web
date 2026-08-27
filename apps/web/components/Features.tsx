const features = [
  {
    number: "02",
    title: "Structured Learning",
    description:
      "Self-paced certified courses in Cell Culture, Molecular Biology, and Microscopy with modular content and assessments.",
  },
  {
    number: "03",
    title: "Community & Networking",
    description:
      "Connect and interact with like-minded people from the Life Sciences community.",
  },
  {
    number: "04",
    title: "Learn with the Best",
    description:
      "Learn, discuss, and exchange ideas with peers and experienced instructors.",
  },
  {
    number: "05",
    title: "Practice Online Tests",
    description:
      "Quizzes and live tests help you practice concepts and improve your performance.",
  },
  {
    number: "06",
    title: "Get Certified",
    description:
      "Showcase your skills with course certificates and strengthen your professional profile.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#f8fafc] py-14 sm:py-16 lg:py-20"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 h-[400px] w-[400px] rounded-full bg-blue-100/30 blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-slate-200/40 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

          <div className="max-w-3xl">

            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-slate-400" />

              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Why CellsInVitro
              </span>
            </div>

            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">
              More than research.
              <br />
              <span className="text-slate-400">
                A space to grow.
              </span>
            </h2>

          </div>

          <p className="max-w-md text-sm leading-6 text-slate-600">
            Bringing research, learning, collaboration, and professional
            development together for the Life Sciences community.
          </p>

        </div>

        {/* ================= 3 × 2 GRID ================= */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 md:grid-cols-2 lg:grid-cols-3">

          {/* ================= 01 · R&D ================= */}
          <article className="group relative min-h-[250px] overflow-hidden rounded-[1.75rem] border border-slate-900 bg-slate-950 p-6 text-white shadow-sm">

            {/* Background Number */}
            <span className="pointer-events-none absolute -right-3 -top-8 text-[125px] font-bold leading-none text-white/[0.035]">
              01
            </span>

            {/* Scientific Visual */}
            <div className="pointer-events-none absolute -right-24 -top-12 h-[300px] w-[300px] opacity-80 transition-transform duration-700 group-hover:scale-105">

              <svg
                viewBox="0 0 500 500"
                className="h-full w-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>

                  <radialGradient id="cellGlow">
                    <stop
                      offset="0%"
                      stopColor="#ffffff"
                      stopOpacity="0.22"
                    />

                    <stop
                      offset="60%"
                      stopColor="#bfdbfe"
                      stopOpacity="0.08"
                    />

                    <stop
                      offset="100%"
                      stopColor="#bfdbfe"
                      stopOpacity="0"
                    />
                  </radialGradient>

                  <filter id="blur">
                    <feGaussianBlur stdDeviation="12" />
                  </filter>

                </defs>

                <circle
                  cx="260"
                  cy="250"
                  r="190"
                  fill="url(#cellGlow)"
                  filter="url(#blur)"
                />

                <circle
                  cx="260"
                  cy="250"
                  r="145"
                  stroke="#bfdbfe"
                  strokeOpacity="0.16"
                  strokeWidth="1"
                />

                <circle
                  cx="260"
                  cy="250"
                  r="105"
                  stroke="#dbeafe"
                  strokeOpacity="0.18"
                  strokeWidth="1"
                />

                <circle
                  cx="260"
                  cy="250"
                  r="65"
                  fill="#dbeafe"
                  fillOpacity="0.05"
                  stroke="#dbeafe"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                />

                <circle
                  cx="245"
                  cy="235"
                  r="18"
                  fill="#dbeafe"
                  fillOpacity="0.18"
                />

                <circle
                  cx="280"
                  cy="270"
                  r="9"
                  fill="#bfdbfe"
                  fillOpacity="0.2"
                />

                <path
                  d="M110 180C160 120 220 140 270 105C320 70 370 110 410 155"
                  stroke="#bfdbfe"
                  strokeOpacity="0.18"
                />

                <path
                  d="M90 330C145 390 210 355 260 390C315 425 365 380 425 325"
                  stroke="#bfdbfe"
                  strokeOpacity="0.15"
                />

                <circle
                  cx="120"
                  cy="180"
                  r="5"
                  fill="#dbeafe"
                  fillOpacity="0.4"
                />

                <circle
                  cx="410"
                  cy="155"
                  r="4"
                  fill="#dbeafe"
                  fillOpacity="0.35"
                />

                <circle
                  cx="425"
                  cy="325"
                  r="5"
                  fill="#dbeafe"
                  fillOpacity="0.3"
                />
              </svg>

            </div>

            {/* R&D Content */}
            <div className="relative z-10 flex h-full flex-col justify-between">

              <div>

                <div className="flex items-center justify-between">

                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    01 · Research
                  </span>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-slate-300 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/10">
                    ↗
                  </span>

                </div>

                <h3 className="mt-12 text-3xl font-semibold tracking-tight">
                  R & D
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                  We are working on the development of kits designed for
                  research purposes, supporting the next generation of
                  scientific exploration.
                </p>

              </div>

              <div className="mt-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">

                <span className="h-px w-7 bg-slate-700" />

                Research & Development

              </div>

            </div>

          </article>

          {/* ================= 02 ================= */}
          <FeatureCard
            number="02"
            title="Structured Learning"
            description="Certified courses covering Cell Culture, Molecular Biology, and Microscopy are coming soon."
          />

          {/* ================= 03 ================= */}
          <FeatureCard
            number="03"
            title="Community & Networking"
            description="Connect and interact with like-minded people from the Life Sciences community."
          />

          {/* ================= 04 ================= */}
          <FeatureCard
            number="04"
            title="Learn with the Best"
            description="Learn, discuss, and exchange ideas with peers and experienced instructors."
          />

          {/* ================= 05 ================= */}
          <FeatureCard
            number="05"
            title="Practice Online Tests"
            description="Quizzes and live tests help you practice concepts and improve your performance."
          />

          {/* ================= 06 ================= */}
          <FeatureCard
            number="06"
            title="Get Certified"
            description="Showcase your skills with course certificates and strengthen your professional profile."
          />

        </div>

      </div>
    </section>
  );
}


/* =====================================================
   FEATURE CARD
===================================================== */

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="group relative min-h-[250px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/[0.06]">

      {/* Large Background Number */}
      <span className="pointer-events-none absolute -right-3 -top-5 text-[120px] font-bold leading-none text-slate-100 transition-colors duration-500 group-hover:text-slate-200">
        {number}
      </span>

      {/* Top */}
      <div className="relative flex items-center justify-between">

        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {number}
        </span>

        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-500 transition-all duration-300 group-hover:border-slate-950 group-hover:bg-slate-950 group-hover:text-white">
          ↗
        </span>

      </div>

      {/* Content */}
      <div className="relative mt-12">

        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>

        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
          {description}
        </p>

      </div>

      {/* Hover Line */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-slate-950 transition-all duration-500 group-hover:w-full" />

    </article>
  );
}