"use client";

import { useEffect, useState } from "react";

const testimonials = [
  {
    quote:
      "CellsInVitro brings research and learning together in a way that makes Life Sciences more accessible and practical.",
    name: "Dr. Researcher",
    role: "Life Sciences Researcher",
    initials: "DR",
  },
  {
    quote:
      "The focus on practical research solutions and structured learning creates a strong foundation for students and researchers.",
    name: "Dr. Scientist",
    role: "Biotechnology Professional",
    initials: "DS",
  },
  {
    quote:
      "A thoughtful ecosystem for researchers, students, and professionals looking to grow their knowledge in biotechnology.",
    name: "Dr. Biotech",
    role: "Research Professional",
    initials: "DB",
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeTestimonial = testimonials[activeIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) =>
        current === testimonials.length - 1 ? 0 : current + 1
      );
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const previous = () => {
    setActiveIndex((current) =>
      current === 0 ? testimonials.length - 1 : current - 1
    );
  };

  const next = () => {
    setActiveIndex((current) =>
      current === testimonials.length - 1 ? 0 : current + 1
    );
  };

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-white py-8 sm:py-10 lg:h-[560px] lg:py-12"
    >
      {/* Very subtle background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100/70 blur-3xl"
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col px-6 lg:px-8">

        {/* ================= HEADER ================= */}

        <div className="shrink-0 text-center">

          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            What People Say
          </span>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-[36px]">
            Trusted by the Life Sciences community.
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
            Insights from researchers, professionals, and learners
            building the future of biotechnology.
          </p>

        </div>

        {/* ================= TESTIMONIAL ================= */}

        <div className="mx-auto mt-6 w-full max-w-4xl">

          <div
            key={activeIndex}
            className="relative h-[245px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#f6f8fa] px-6 py-7 shadow-sm sm:h-[250px] sm:px-10"
          >

            {/* Large quote mark */}

            <div
              aria-hidden="true"
              className="absolute -left-1 -top-6 select-none font-serif text-[85px] leading-none text-slate-200"
            >
              “
            </div>

            {/* Scientific circles */}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full border border-slate-200/70"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full border border-slate-200/60"
            />

            {/* Content */}

            <div className="relative flex h-full flex-col items-center justify-center text-center">

              <blockquote className="max-w-3xl text-base font-medium leading-6 tracking-tight text-slate-800 sm:text-lg sm:leading-7 lg:text-[20px]">
                {activeTestimonial.quote}
              </blockquote>

              {/* Author */}

              <div className="mt-5 flex items-center gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[9px] font-semibold text-white">
                  {activeTestimonial.initials}
                </div>

                <div className="text-left">

                  <p className="text-xs font-semibold text-slate-950 sm:text-sm">
                    {activeTestimonial.name}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                    {activeTestimonial.role}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ================= CONTROLS ================= */}

          <div className="mt-4 flex items-center justify-center gap-4">

            <button
              type="button"
              onClick={previous}
              aria-label="Previous testimonial"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 transition-all duration-300 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              ←
            </button>

            <div className="flex items-center gap-1.5">

              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to testimonial ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeIndex === index
                      ? "w-6 bg-slate-950"
                      : "w-1.5 bg-slate-300 hover:bg-slate-500"
                  }`}
                />
              ))}

            </div>

            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 transition-all duration-300 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            >
              →
            </button>

          </div>

        </div>

      </div>
    </section>
  );
}