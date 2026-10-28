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
        "relative rounded-2xl p-[1px] overflow-hidden transition-all duration-300",
        active ? "bg-gradient-to-r from-brand-orange via-brand-amber to-brand-orange shadow-glowSm" : "bg-surface-border hover:bg-surface-borderHover",
        className
      )}
      {...props}
    >
      <div className="relative rounded-[15px] bg-surface-main h-full w-full">
        {children}
      </div>
    </div>
  );
};
