import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedLayerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Forces the active/hover state — used on touch devices to play the animation before opening a modal. */
  forceActive?: boolean;
}

/** Brand-palette concentric circles with three off-axis dots so the rotation is visible. */
const CircleMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="50" cy="50" r="48" fill="hsl(220 70% 18%)" />
    <circle cx="50" cy="50" r="40" fill="hsl(38 65% 50%)" />
    <circle cx="50" cy="50" r="32" fill="#ffffff" />
    <circle cx="50" cy="50" r="22" fill="hsl(220 70% 45%)" />
    <circle cx="50" cy="50" r="6" fill="hsl(38 65% 55%)" />
    {/* Off-axis dots make the rotation visible while keeping the "all circles" look */}
    <circle cx="50" cy="14" r="3.5" fill="hsl(38 65% 55%)" />
    <circle cx="86" cy="50" r="3" fill="#ffffff" />
    <circle cx="50" cy="86" r="2.5" fill="hsl(38 65% 55%)" />
  </svg>
);

const AnimatedLayerButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedLayerButtonProps
>(({ className, children, forceActive = false, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-active={forceActive ? "true" : undefined}
      className={cn(
        "group relative inline-flex h-[52px] min-w-[210px] items-center justify-center overflow-hidden rounded-[30px] border-none px-7",
        "cursor-pointer bg-cobalt shadow-[8px_8px_0px_hsl(var(--foreground))]",
        "transition-[transform,box-shadow] duration-300 ease-out will-change-transform",
        "hover:translate-y-[5px] hover:shadow-[3px_3px_0px_hsl(var(--foreground))]",
        "data-[active=true]:translate-y-[5px] data-[active=true]:shadow-[3px_3px_0px_hsl(var(--foreground))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Expanding fill — origin-left scaleX, GPU only, no layout reflow */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 origin-left bg-gradient-to-r from-cobalt-light via-cobalt to-[hsl(220,70%,20%)]",
          "scale-x-0 transition-transform duration-500 ease-out will-change-transform",
          "group-hover:scale-x-100 group-data-[active=true]:scale-x-100",
        )}
      />

      {/* Centered circle mark — appears as the fill completes */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 z-[3] h-9 w-9 -translate-x-1/2 -translate-y-1/2",
          "scale-0 opacity-0 transition-[transform,opacity] duration-300 ease-out delay-150 will-change-transform",
          "group-hover:scale-100 group-hover:opacity-100",
          "group-data-[active=true]:scale-100 group-data-[active=true]:opacity-100",
        )}
      >
        <CircleMark
          className={cn(
            "h-full w-full",
            "group-hover:animate-[spin_3s_linear_infinite]",
            "group-data-[active=true]:animate-[spin_3s_linear_infinite]",
          )}
        />
      </span>

      {/* Text */}
      <span
        className={cn(
          "relative z-[5] font-semibold text-primary-foreground tracking-wide text-[1.05em]",
          "transition-opacity duration-300",
          "group-hover:opacity-0 group-data-[active=true]:opacity-0",
        )}
      >
        {children}
      </span>
    </button>
  );
});
AnimatedLayerButton.displayName = "AnimatedLayerButton";

export { AnimatedLayerButton };
