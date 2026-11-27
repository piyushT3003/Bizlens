import React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "showcase" | "interactive";
  glow?: boolean;
  hoverLift?: boolean;
  slide?: "up" | "down" | "left" | "right" | "scale" | "none";
  stagger?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  tilt?: boolean;
  hoverGlow?: boolean;
  shimmer?: boolean;
  entrance?: "reveal-up" | "fade" | "none";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  variant = "default",
  glow = false,
  hoverLift = false,
  slide = "none",
  stagger,
  tilt,
  hoverGlow = false,
  shimmer = true,
  entrance = "none",
  children,
  onMouseMove,
  onMouseLeave,
  style,
  ...props
}) => {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const enableTilt = tilt ?? (hoverLift || variant === "showcase" || variant === "interactive");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseMove) onMouseMove(e);
    if (!enableTilt || !cardRef.current) return;

    const isMotionOff =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-motion") === "off";
    if (isMotionOff) return;

    const rect = cardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rx = (0.5 - py) * 5.2; // subtle ±2.6 deg pitch
    const ry = (px - 0.5) * 5.6; // subtle ±2.8 deg yaw
    const gx = Math.round(e.clientX - rect.left);
    const gy = Math.round(e.clientY - rect.top);

    cardRef.current.style.setProperty("--card-rx", `${rx.toFixed(2)}deg`);
    cardRef.current.style.setProperty("--card-ry", `${ry.toFixed(2)}deg`);
    cardRef.current.style.setProperty("--glare-x", `${gx}px`);
    cardRef.current.style.setProperty("--glare-y", `${gy}px`);
    cardRef.current.style.setProperty("--glare-op", "1");
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseLeave) onMouseLeave(e);
    if (!enableTilt || !cardRef.current) return;
    cardRef.current.style.setProperty("--card-rx", "0deg");
    cardRef.current.style.setProperty("--card-ry", "0deg");
    cardRef.current.style.setProperty("--glare-op", "0");
  };

  const slideClass =
    slide === "up"
      ? "animate-slide-up"
      : slide === "down"
      ? "animate-slide-down"
      : slide === "left"
      ? "animate-slide-left"
      : slide === "right"
      ? "animate-slide-right"
      : slide === "scale"
      ? "animate-slide-scale"
      : "";

  const entranceClass =
    entrance === "reveal-up"
      ? "animate-entrance-reveal"
      : entrance === "fade"
      ? "animate-entrance-fade"
      : "";

  const staggerClass = stagger ? `stagger-${stagger}` : "";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-300 ease-out gloss-sheen",
        "bg-surface-card border-surface-border text-text-main",
        "backdrop-blur-xl shadow-md",
        enableTilt && "card-3d-interactive",
        shimmer && "hover-shimmer-trigger",
        (glow || hoverGlow) &&
          "shadow-glowSm hover:shadow-glowMd border-brand-orange/40 hover-glow-ambient",
        hoverLift &&
          "card-3d cursor-pointer hover:border-surface-borderHover active:translate-y-[1px] micro-press",
        variant === "showcase" &&
          "border-brand-orange/45 bg-gradient-to-b from-brand-orange/[0.12] to-transparent shadow-glowSm card-3d hover-glow-ambient",
        variant === "interactive" &&
          "card-3d cursor-pointer hover:border-brand-orange/50 active:translate-y-[1px] micro-press hover-glow-ambient",
        slideClass,
        entranceClass,
        staggerClass,
        className
      )}
      {...props}
    >
      {/* Dynamic Cursor Specular Glare Overlay */}
      {enableTilt && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-[1]"
          style={{
            opacity: "var(--glare-op, 0)",
            background:
              "radial-gradient(380px circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255, 160, 75, 0.14), rgba(255, 122, 26, 0.04) 45%, transparent 75%)",
          }}
        />
      )}
      {children}
    </div>
  );
};
