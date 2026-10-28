import React from "react";
import { cn } from "@/lib/utils";
import { SmoothLoader } from "@/components/ui/SmoothLoader";

export { SmoothLoader };

export const BrandLoader: React.FC<{ size?: "sm" | "md" | "lg"; label?: string }> = ({
  size = "md",
  label = "Loading BizLens...",
}) => {
  return <SmoothLoader size={size} label={label} sublabel="Deterministic Columnar Analysis" />;
};

export const SkeletonLoader: React.FC<{ className?: string; lines?: number }> = ({
  className,
  lines = 3,
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-4 rounded-lg bg-surface-border/40 relative overflow-hidden glass-panel"
          style={{ width: `${Math.max(45, 100 - idx * 18)}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-orange/15 to-transparent -translate-x-full animate-shimmer" />
        </div>
      ))}
    </div>
  );
};
