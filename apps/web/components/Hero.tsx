import Link from "next/link";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen overflow-hidden bg-white"
    >
      {/* Full-screen cell video */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/cell-division.mp4" type="video/mp4" />
        </video>

        {/* Soft readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10" />

        {/* Very subtle bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/40 to-transparent" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-16 pt-32 lg:px-8">
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />

            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Advancing Cellular Research
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Where cellular science meets innovation.
          </h1>

          {/* Description */}
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Empowering researchers with reliable, research-focused solutions
            designed to accelerate discovery and advance the future of
            biotechnology.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#kits"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Explore Research Kits
              <span>→</span>
            </Link>

            <Link
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-6 py-3.5 text-sm font-semibold text-slate-700 backdrop-blur-sm transition-all hover:bg-white"
            >
              Discover More
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}