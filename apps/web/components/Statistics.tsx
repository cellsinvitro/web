"use client";

import { useEffect, useRef, useState } from "react";

const statistics = [
  {
    value: 50,
    suffix: "+",
    label: "Research Kit Areas",
    description:
      "Focused solutions for cellular and biotechnology research.",
  },
  {
    value: 20,
    suffix: "+",
    label: "Learning Programs",
    description:
      "Opportunities to build practical Life Sciences knowledge.",
  },
  {
    value: 35,
    suffix: "+",
    label: "Life Science Areas",
    description:
      "Connecting research, learning, and scientific exploration.",
  },
  {
    value: 100,
    suffix: "%",
    label: "Research Focused",
    description:
      "Built around the needs of modern Life Sciences.",
  },
];

export default function Statistics() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.3,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="statistics"
      className="relative overflow-hidden bg-[#f4f6f8] py-16 sm:py-20 lg:py-24"
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-200/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

        {/* ================= HEADER ================= */}

        <div className="mx-auto max-w-3xl text-center">

          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Our Progress
          </span>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[42px]">
            Growing with the Life Sciences community.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Research, education, and scientific innovation brought together
            through one growing ecosystem.
          </p>

        </div>

        {/* ================= STATISTICS ================= */}

        <div className="mt-12 grid grid-cols-1 border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-4">

          {statistics.map((stat, index) => (
            <article
              key={stat.label}
              className={`
                group relative px-6 py-8 text-center
                sm:px-7 sm:py-9
                lg:px-8 lg:py-10
                ${
                  index !== 0
                    ? "border-t border-slate-200 sm:border-l sm:border-t-0"
                    : ""
                }
              `}
            >

              {/* Number */}

              <div className="flex items-baseline justify-center">

                <span className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {started ? (
                    <CountUp target={stat.value} />
                  ) : (
                    0
                  )}
                </span>

                <span className="ml-1 text-xl font-medium text-slate-400 sm:text-2xl">
                  {stat.suffix}
                </span>

              </div>

              {/* Label */}

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 sm:text-sm">
                {stat.label}
              </h3>

              {/* Separator */}

              <div className="mx-auto mt-4 h-px w-10 bg-slate-300 transition-all duration-500 group-hover:w-16 group-hover:bg-slate-500" />

              {/* Description */}

              <p className="mx-auto mt-4 max-w-[220px] text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                {stat.description}
              </p>

            </article>
          ))}

        </div>

      </div>
    </section>
  );
}


/* =====================================================
   SMOOTH COUNT-UP ANIMATION
===================================================== */

function CountUp({
  target,
}: {
  target: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    // Total animation duration
    const duration = 2200;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;

      const progress = Math.min(
        elapsed / duration,
        1
      );

      /*
       * Smooth ease-out:
       * - Starts gently
       * - Speeds up
       * - Slows down near the final value
       */
      const easedProgress =
        1 - Math.pow(1 - progress, 4);

      const currentValue = Math.round(
        easedProgress * target
      );

      setCount(currentValue);

      if (progress < 1) {
        animationFrame =
          requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [target]);

  return <>{count}</>;
}