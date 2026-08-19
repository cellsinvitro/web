"use client";

import Image from "next/image";

const teamMembers = [
  {
    name: "Dr. Satyam Kumar Agrawal",
    role: "Founder Director & CEO",
    image: "/images/team/pic1.jpg",
  },
  {
    name: "Dr. Madhunika Agrawal",
    role: "Founder Director & CKO",
    image: "/images/team/pic2.jpg",
  },
];

export default function Team() {
  return (
    <section
      id="team"
      className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24"
    >
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-100/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">

        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">

          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Our Team
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[42px]">
            Meet the people behind
            <span className="text-slate-500"> CellsInVitro.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            A team bringing together scientific knowledge, research,
            and a shared vision for life-science innovation.
          </p>
        </div>

        {/* Team */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-10 md:grid-cols-2 md:gap-16">

          {teamMembers.map((member) => (
            <article
              key={member.name}
              className="group text-center"
            >

              {/* Photo */}
              <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-full bg-slate-100 sm:h-48 sm:w-48">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="192px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Name */}
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                {member.name}
              </h3>

              {/* Role */}
              <p className="mt-2 text-sm text-slate-500">
                {member.role}
              </p>

              {/* Minimal divider */}
              <div className="mx-auto mt-5 h-px w-10 bg-slate-200 transition-all duration-300 group-hover:w-16" />

            </article>
          ))}

        </div>

        {/* Bottom statement */}
        <div className="mx-auto mt-12 max-w-xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Research · Education · Innovation
          </p>
        </div>

      </div>
    </section>
  );
}