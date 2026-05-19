"use client";
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────
   Liquid gradient effect — adapted from the ui-layouts "GitHub button"
   demo. Star icon and external links were stripped; we expose a thin
   button wrapper that integrates with our CTA touch-press flow.

   Performance notes for mid-range mobile:
   - Idle (not hovered/active) renders a CHEAP static gradient.
   - The expensive animated radial-gradient + 7 blended blobs only mount
     while the button is hovered or forceActive=true.
   - prefers-reduced-motion disables animation entirely.
────────────────────────────────────────────────────────────────── */

type ColorKey =
  | "color1" | "color2" | "color3" | "color4" | "color5" | "color6"
  | "color7" | "color8" | "color9" | "color10" | "color11" | "color12"
  | "color13" | "color14" | "color15" | "color16" | "color17";

export type Colors = Record<ColorKey, string>;

const svgOrder = ["svg1", "svg2", "svg3", "svg4", "svg3", "svg2", "svg1"] as const;
type SvgKey = (typeof svgOrder)[number];

type Stop = { offset: number; stopColor: string };
type SvgState = { gradientTransform: string; stops: Stop[] };
type SvgStates = Record<SvgKey, SvgState>;

const createStopsArray = (
  svgStates: SvgStates,
  order: readonly SvgKey[],
  maxStops: number,
): Stop[][] => {
  const arr: Stop[][] = [];
  for (let i = 0; i < maxStops; i++) {
    arr.push(
      order.map((k) => {
        const s = svgStates[k];
        return s.stops[i] || s.stops[s.stops.length - 1];
      }),
    );
  }
  return arr;
};

interface GradientSvgProps {
  className: string;
  isHovered: boolean;
  colors: Colors;
}

const GradientSvg = ({ className, isHovered, colors }: GradientSvgProps) => {
  const svgStates: SvgStates = {
    svg1: {
      gradientTransform:
        "translate(287.5 280) rotate(-29.0546) scale(689.807 1000)",
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.188423, stopColor: colors.color2 },
        { offset: 0.260417, stopColor: colors.color3 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.328992, stopColor: colors.color1 },
        { offset: 0.442708, stopColor: colors.color6 },
        { offset: 0.537556, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.725645, stopColor: colors.color8 },
        { offset: 0.817779, stopColor: colors.color9 },
        { offset: 0.84375, stopColor: colors.color10 },
        { offset: 0.90569, stopColor: colors.color1 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
    svg2: {
      gradientTransform:
        "translate(126.5 418.5) rotate(-64.756) scale(533.444 773.324)",
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.104167, stopColor: colors.color12 },
        { offset: 0.182292, stopColor: colors.color13 },
        { offset: 0.28125, stopColor: colors.color1 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.453125, stopColor: colors.color6 },
        { offset: 0.515625, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.692708, stopColor: colors.color8 },
        { offset: 0.75, stopColor: colors.color14 },
        { offset: 0.817708, stopColor: colors.color9 },
        { offset: 0.869792, stopColor: colors.color10 },
        { offset: 1, stopColor: colors.color1 },
      ],
    },
    svg3: {
      gradientTransform:
        "translate(264.5 339.5) rotate(-42.3022) scale(946.451 1372.05)",
      stops: [
        { offset: 0, stopColor: colors.color1 },
        { offset: 0.188423, stopColor: colors.color2 },
        { offset: 0.307292, stopColor: colors.color1 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.442708, stopColor: colors.color15 },
        { offset: 0.537556, stopColor: colors.color16 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.725645, stopColor: colors.color17 },
        { offset: 0.817779, stopColor: colors.color9 },
        { offset: 0.84375, stopColor: colors.color10 },
        { offset: 0.90569, stopColor: colors.color1 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
    svg4: {
      gradientTransform:
        "translate(860.5 420) rotate(-153.984) scale(957.528 1388.11)",
      stops: [
        { offset: 0.109375, stopColor: colors.color11 },
        { offset: 0.171875, stopColor: colors.color2 },
        { offset: 0.260417, stopColor: colors.color13 },
        { offset: 0.328792, stopColor: colors.color4 },
        { offset: 0.328892, stopColor: colors.color5 },
        { offset: 0.328992, stopColor: colors.color1 },
        { offset: 0.442708, stopColor: colors.color6 },
        { offset: 0.515625, stopColor: colors.color7 },
        { offset: 0.631738, stopColor: colors.color1 },
        { offset: 0.692708, stopColor: colors.color8 },
        { offset: 0.817708, stopColor: colors.color9 },
        { offset: 0.869792, stopColor: colors.color10 },
        { offset: 1, stopColor: colors.color11 },
      ],
    },
  };

  const maxStops = Math.max(...Object.values(svgStates).map((s) => s.stops.length));
  const stopsAnimationArray = createStopsArray(svgStates, svgOrder, maxStops);
  const gradientTransform = svgOrder.map((k) => svgStates[k].gradientTransform);

  const variants = {
    hovered: {
      gradientTransform,
      transition: { duration: 50, repeat: Infinity, ease: "linear" as const },
    },
    notHovered: {
      gradientTransform,
      transition: { duration: 10, repeat: Infinity, ease: "linear" as const },
    },
  };

  return (
    <svg
      className={className}
      width="1030"
      height="280"
      viewBox="0 0 1030 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="1030" height="280" rx="140" fill="url(#paint0_radial_luce)" />
      <defs>
        <motion.radialGradient
          id="paint0_radial_luce"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          animate={isHovered ? variants.hovered : variants.notHovered}
        >
          {stopsAnimationArray.map((stopConfigs, index) => (
            <AnimatePresence key={index}>
              <motion.stop
                initial={{
                  offset: stopConfigs[0].offset,
                  stopColor: stopConfigs[0].stopColor,
                }}
                animate={{
                  offset: stopConfigs.map((c) => c.offset),
                  stopColor: stopConfigs.map((c) => c.stopColor),
                }}
                transition={{ duration: 0, ease: "linear", repeat: Infinity }}
              />
            </AnimatePresence>
          ))}
        </motion.radialGradient>
      </defs>
    </svg>
  );
};

interface LiquidProps {
  isHovered: boolean;
  colors: Colors;
}

export const Liquid = ({ isHovered, colors }: LiquidProps) => (
  <>
    {Array.from({ length: 7 }).map((_, index) => (
      <div
        key={index}
        className={`absolute ${
          index < 3 ? "w-[443px] h-[121px]" : "w-[756px] h-[207px]"
        } ${
          index === 0
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
            : index === 1
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[164.971deg] mix-blend-difference"
              : index === 2
                ? "top-1/2 left-1/2 -translate-x-[53%] -translate-y-[53%] rotate-[-11.61deg] mix-blend-difference"
                : index === 3
                  ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-[57%] rotate-[-179.012deg] mix-blend-difference"
                  : index === 4
                    ? "top-1/2 left-1/2 -translate-x-[57%] -translate-y-1/2 rotate-[-29.722deg] mix-blend-difference"
                    : index === 5
                      ? "top-1/2 left-1/2 -translate-x-[62%] -translate-y-[24%] rotate-[160.227deg] mix-blend-difference"
                      : "top-1/2 left-1/2 -translate-x-[67%] -translate-y-[29%] rotate-180 mix-blend-hard-light"
        }`}
      >
        <GradientSvg className="w-full h-full" isHovered={isHovered} colors={colors} />
      </div>
    ))}
  </>
);

/* ──────────────────────────────────────────────────────────────────
   LiquidButton — the integrated CTA
────────────────────────────────────────────────────────────────── */

/* LUCE palette — pure cobalt + gold + cream tones. Removed the muddy
   pale cobalts that washed out the animation; the gradient now cycles
   between deep navy bases and warm gold accents only. */
const DEFAULT_COLORS: Colors = {
  color1: "#FFFFFF",       // bright highlight
  color2: "#16275F",       // cobalt-mid
  color3: "#D49120",       // GOLD accent (was pale gray)
  color4: "#FFF6E2",       // warm cream
  color5: "#F4E7C5",       // gold cream
  color6: "#1C378C",       // cobalt-light
  color7: "#0F1F3D",       // cobalt brand
  color8: "#0B1731",       // cobalt deep
  color9: "#D49120",       // gold brand
  color10: "#EDB652",      // gold light
  color11: "#0F1F3D",      // cobalt deep
  color12: "#F4E7C5",      // gold cream (was pale cobalt)
  color13: "#16275F",      // cobalt mid
  color14: "#E0C77A",      // warm gold
  color15: "#D49120",      // gold (was pale cobalt)
  color16: "#0B1731",      // very deep cobalt
  color17: "#1C378C",      // cobalt light
};

interface LiquidButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Force the active/animated state (used on touch press before opening a modal). */
  forceActive?: boolean;
  /** Optional palette override; defaults to the example blue/indigo palette. */
  colors?: Colors;
}

export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ children, forceActive = false, colors = DEFAULT_COLORS, className, onMouseEnter, onMouseLeave, ...rest }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    // Animate only when needed — saves CPU on mid-range phones.
    const active = !prefersReducedMotion && (isHovered || forceActive);

    /* Smooth crossfade for the Liquid layer:
       - When `active` becomes true: mount Liquid immediately at opacity 0,
         then on the next animation frame flip to opacity 1 so the
         browser sees a real transition (no jump).
       - When `active` becomes false: fade opacity to 0, then unmount
         after the transition completes so the expensive nodes leave
         the tree. */
    const FADE_MS = 450;
    const [renderLiquid, setRenderLiquid] = useState(false);
    const [visibleLiquid, setVisibleLiquid] = useState(false);

    useEffect(() => {
      if (active) {
        setRenderLiquid(true);
        const id = requestAnimationFrame(() => setVisibleLiquid(true));
        return () => cancelAnimationFrame(id);
      }
      setVisibleLiquid(false);
      const t = setTimeout(() => setRenderLiquid(false), FADE_MS);
      return () => clearTimeout(t);
    }, [active]);

    return (
      <div
        className={`relative inline-block group h-[3.4em] rounded-[30px] transition-shadow duration-500 ${
          active
            ? "shadow-[0_10px_30px_-10px_rgba(15,31,61,0.35)]"
            : "shadow-[0_6px_18px_-10px_rgba(15,31,61,0.25)]"
        }`}
      >
        {/* Card shell */}
        <div className="absolute inset-0 rounded-[30px] bg-[#0B1731] overflow-hidden">
          {/* Static base gradient — visible whenever the liquid layers
              aren't mounted, so the button never looks plain. Cobalt
              tones with a faint warm gold core. */}
          <span
            aria-hidden="true"
            className={`absolute inset-0 rounded-[30px] bg-[radial-gradient(120%_120%_at_30%_30%,hsl(38_65%_50%/0.25)_0%,hsl(220_60%_25%)_35%,hsl(220_70%_12%)_80%)] transition-opacity ease-out ${
              active ? "opacity-0" : "opacity-100"
            }`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          />
          {/* Liquid effect — mounted on activate, smoothly faded in/out */}
          {renderLiquid && (
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-opacity ease-out"
              style={{
                opacity: visibleLiquid ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            >
              <Liquid isHovered={isHovered || forceActive} colors={colors} />
            </div>
          )}
        </div>

        {/* The actual button — text + search icon with breathing room */}
        <button
          ref={ref}
          className={`relative h-full w-auto rounded-[30px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 ${
            className ?? ""
          }`}
          onMouseEnter={(e) => {
            setIsHovered(true);
            onMouseEnter?.(e);
          }}
          onMouseLeave={(e) => {
            setIsHovered(false);
            onMouseLeave?.(e);
          }}
          type="button"
          {...rest}
        >
          <span className="flex h-full w-full items-center justify-center gap-2.5 px-7 sm:px-9 text-white text-sm sm:text-base font-semibold tracking-wide whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            <Search
              size={17}
              strokeWidth={2.4}
              className="text-white flex-shrink-0 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110"
            />
            {children}
          </span>
        </button>
      </div>
    );
  },
);
LiquidButton.displayName = "LiquidButton";
