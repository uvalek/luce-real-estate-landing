import { useEffect, useRef, useState } from "react";

interface AnimatedStatProps {
  value: string;       // e.g. "850+", "3,200+", "45+"
  label: string;
  duration?: number;   // animation duration in ms
}

/** Parses "3,200+" into { prefix: "", num: 3200, suffix: "+" } */
function parseValue(v: string): { prefix: string; num: number; suffix: string } {
  const match = v.match(/^(\D*?)([\d,]+)(\D*)$/);
  if (!match) return { prefix: "", num: 0, suffix: v };
  return {
    prefix: match[1],
    num: parseInt(match[2].replace(/,/g, ""), 10),
    suffix: match[3],
  };
}

/** easeOutCubic: fast start, smooth slow down at the end */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const AnimatedStat = ({ value, label, duration = 2000 }: AnimatedStatProps) => {
  const { prefix, num, suffix } = parseValue(value);
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  // Trigger animation when element scrolls into view
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCurrent(num);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          let rafId = 0;

          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutCubic(progress);
            setCurrent(Math.floor(eased * num));
            if (progress < 1) {
              rafId = requestAnimationFrame(tick);
            } else {
              setCurrent(num);
            }
          };

          rafId = requestAnimationFrame(tick);
          observer.disconnect();
          return () => cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [num, duration]);

  return (
    <div ref={ref} className="text-center group">
      <p className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold text-cobalt tabular-nums leading-none tracking-tight">
        {prefix}
        <span className="text-gold">{suffix}</span>
        {current.toLocaleString("es-MX")}
      </p>
      <div className="mt-3 mx-auto h-[3px] w-10 rounded-full bg-gold/80 transition-all duration-300 group-hover:w-16" />
      <p className="mt-3 text-xs md:text-sm font-semibold tracking-[0.18em] uppercase text-foreground/70">
        {label}
      </p>
    </div>
  );
};

export default AnimatedStat;
