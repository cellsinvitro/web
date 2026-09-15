"use client";

/**
 * NavigationLoader
 *
 * Shows the branded top progress bar during every client-side route transition.
 * It detects navigation by watching `usePathname` + `useSearchParams`. When either
 * changes the bar animates up to ~85 %, then snaps to 100 % and fades out.
 *
 * A 120 ms appearance delay prevents a flash on fast (cached) navigations.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ProgressBar } from "@/components/GlobalLoader";

type Phase = "idle" | "running" | "done";

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  // Track the last settled route so we can detect a genuine change.
  const settledKey = useRef(`${pathname}?${searchParams}`);
  // Timer refs so we can cancel them on rapid navigations.
  const appearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = () => {
    if (appearTimer.current) { clearTimeout(appearTimer.current); appearTimer.current = null; }
    if (tickInterval.current) { clearInterval(tickInterval.current); tickInterval.current = null; }
    if (doneTimer.current) { clearTimeout(doneTimer.current); doneTimer.current = null; }
  };

  useEffect(() => {
    const currentKey = `${pathname}?${searchParams}`;
    if (currentKey === settledKey.current) return;

    // A new route has arrived — we're done navigating.
    settledKey.current = currentKey;
    clearAll();
    setProgress(100);
    setPhase("done");

    doneTimer.current = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, 350);

    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // We also need to START the bar when a navigation is initiated (i.e. before the
  // new pathname arrives). We do this by listening to the `click` of any <a> or
  // router.push. The simplest cross-framework approach is a capture listener on
  // `click` for same-origin anchor clicks.
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only same-origin non-hash navigations.
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank") return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Skip if already on the same page (hash change or same path).
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }

      // Start the bar.
      clearAll();
      setProgress(0);
      setPhase("idle");

      // Delay appearance slightly so instant cached navigations don't flash.
      appearTimer.current = setTimeout(() => {
        setPhase("running");
        setProgress(8);
        let current = 8;
        tickInterval.current = setInterval(() => {
          // Ease toward 85 % asymptotically.
          const increment = Math.random() * (85 - current) * 0.18;
          current = Math.min(85, current + increment);
          setProgress(current);
        }, 300);
      }, 120);
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      clearAll();
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      style={{ opacity: phase === "done" ? 0 : 1, transition: "opacity 300ms ease" }}
    >
      <ProgressBar progress={progress} />
    </div>
  );
}
