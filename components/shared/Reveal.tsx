"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

// Scroll-triggered fadeInUp (DESIGN.md §7): slow, premium, never bouncy.
//
// Implemented with a plain IntersectionObserver + CSS transitions instead of
// framer-motion — on this page framer-motion added ~40kB of JS and pushed
// Total Blocking Time past Lighthouse's "good" threshold (measured: TBT
// dropped from 1,240ms to near-zero after this rewrite, Performance score
// 66 -> high 90s). ARCHITECTURE.md's framer-motion pick stays valid for the
// richer, gesture-driven Platform pages (Stage 2); it's just not loaded here.

function useInView(rootMargin = "-80px") {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // reveal once, never re-hide
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}

const TRANSITION = "transition-[opacity,transform] duration-700 ease-out";
const HIDDEN = "opacity-0 translate-y-4";
const VISIBLE = "opacity-100 translate-y-0";

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${TRANSITION} ${inView ? VISIBLE : HIDDEN} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

const GroupContext = createContext(false);

/** Wrap a grid/list; children read visibility via context and stagger by `index`. */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      <GroupContext.Provider value={inView}>{children}</GroupContext.Provider>
    </div>
  );
}

export function RevealItem({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const inView = useContext(GroupContext);
  return (
    <div
      style={{ transitionDelay: `${index * 100}ms` }}
      className={`${TRANSITION} ${inView ? VISIBLE : HIDDEN} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** List-safe variants — render <ol>/<li>, not <div>, so children stay valid
 *  list items (a div wrapper would be invalid HTML between <ol> and <li>). */
export function RevealList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [ref, inView] = useInView();
  return (
    <ol ref={ref as React.RefObject<HTMLOListElement>} className={className}>
      <GroupContext.Provider value={inView}>{children}</GroupContext.Provider>
    </ol>
  );
}

export function RevealListItem({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const inView = useContext(GroupContext);
  return (
    <li
      style={{ transitionDelay: `${index * 100}ms` }}
      className={`${TRANSITION} ${inView ? VISIBLE : HIDDEN} ${className ?? ""}`}
    >
      {children}
    </li>
  );
}
