import React from "react";
import { cn } from "@/lib/utils";

export interface GlowBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
}

export const GlowBorder: React.FC<GlowBorderProps> = ({
  className,
  active = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-[1.5px] overflow-hidden transition-all duration-300",
        active
          ? "glow-border-3d shadow-glowMd"
          : "bg-surface-border hover:bg-surface-borderHover",
        className
      )}
      {...props}
    >
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[100%] glow-border-spinner opacity-85"
        />
      )}
      <div className="relative rounded-[14.5px] bg-surface-main h-full w-full z-[1]">
        {children}
      </div>
    </div>
  );
};
