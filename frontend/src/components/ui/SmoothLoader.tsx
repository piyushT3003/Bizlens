import React from "react";
import { cn } from "@/lib/utils";

export interface SmoothLoaderProps {
  size?: "sm" | "md" | "lg" | "fullscreen";
  label?: string;
  sublabel?: string;
  className?: string;
}

export const SmoothLoader: React.FC<SmoothLoaderProps> = ({
  size = "md",
  label = "Computing Deterministic Intelligence...",
  sublabel = "Verifying DuckDB Lineage & Mathematical Guardrails",
  className,
}) => {
  const isFullscreen = size === "fullscreen";

  const ringSizes = {
    sm: "w-7 h-7",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    fullscreen: "w-24 h-24",
  };

  const coreSizes = {
    sm: "w-2 h-2",
    md: "w-3.5 h-3.5",
    lg: "w-5 h-5",
    fullscreen: "w-6 h-6",
  };

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 select-none text-center",
        !isFullscreen && "p-6",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* 3D Quantum Gyroscope Ring Engine */}
      <div className={cn("relative flex items-center justify-center perspective-1000", ringSizes[size])}>
        {/* Outer 3D Gyro Orbit */}
        <div className="absolute inset-0 rounded-full border-2 border-brand-orange/25 border-t-brand-orange shadow-glowSm gyro-ring-1" />
        
        {/* Inner Counter-Rotating Orbit */}
        <div className="absolute inset-1.5 rounded-full border border-brand-amber/35 border-b-brand-amber gyro-ring-2" />
        
        {/* Concentric Ambient Aura */}
        <div className="absolute inset-2.5 rounded-full bg-brand-orange/10 backdrop-blur-sm pointer-events-none" />

        {/* Central Glowing Quantum Nucleus */}
        <div className={cn("rounded-full bg-gradient-to-tr from-brand-orange to-brand-amber quantum-core", coreSizes[size])} />
      </div>

      {/* Frosted Glass Status Capsule */}
      {label && (
        <div className="space-y-1 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border border-brand-orange/30 shadow-glowSm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping" />
            <p className="text-xs font-semibold text-text-main tracking-tight">{label}</p>
          </div>
          {sublabel && (
            <p className="text-[11px] text-text-muted/80 font-mono tracking-tight block mt-1">
              {sublabel}
            </p>
          )}
        </div>
      )}

      <span className="sr-only">Loading</span>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-2xl animate-fade-in">
        <div className="p-8 rounded-3xl glass-card-premium border border-brand-orange/40 shadow-2xl card-3d">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
