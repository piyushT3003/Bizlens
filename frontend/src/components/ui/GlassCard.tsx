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
  tilt = false,
  hoverGlow = false,
  shimmer = true,
  entrance = "none",
  children,
  onMouseMove,
  onMouseLeave,
  style,
  ...props
}) => {
  const [spotlightStyle, setSpotlightStyle] = React.useState<React.CSSProperties>({});
  const cardRef = React.useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseMove) onMouseMove(e);
    if (!tilt || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Ultra-crisp interactive ambient specular spotlight without 3D texture rotation
    setSpotlightStyle({
      backgroundImage: `radial-gradient(350px circle at ${x}px ${y}px, rgba(255, 122, 26, 0.08), transparent 75%)`,
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseLeave) onMouseLeave(e);
    if (!tilt) return;
    setSpotlightStyle({});
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
      style={{ ...spotlightStyle, ...style }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all duration-300 ease-out gloss-sheen",
        // Deep frosted glass tokens
        "bg-surface-card border-surface-border text-text-main",
        // Frosted glass backdrop blur & 3D rim highlight
        "backdrop-blur-xl shadow-md",
        shimmer && "hover-shimmer-trigger",
        (glow || hoverGlow) && "shadow-glowSm hover:shadow-glowMd border-brand-orange/40 hover-glow-ambient",
        hoverLift && "card-3d cursor-pointer hover:border-surface-borderHover active:translate-y-[1px] micro-press",
        variant === "showcase" && "border-brand-orange/45 bg-gradient-to-b from-brand-orange/[0.12] to-transparent shadow-glowSm card-3d hover-glow-ambient",
        variant === "interactive" && "card-3d cursor-pointer hover:border-brand-orange/50 active:translate-y-[1px] micro-press hover-glow-ambient",
        slideClass,
        entranceClass,
        staggerClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

