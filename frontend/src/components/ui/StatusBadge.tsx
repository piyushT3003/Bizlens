import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";

export type StatusType = "positive" | "warning" | "critical" | "neutral";

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  children,
  className,
  icon,
}) => {
  const statusConfig = {
    positive: {
      bg: "bg-status-positiveBg text-status-positive border-status-positive/25",
      defaultIcon: <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    warning: {
      bg: "bg-status-warningBg text-status-warning border-status-warning/25",
      defaultIcon: <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    critical: {
      bg: "bg-status-criticalBg text-status-critical border-status-critical/25",
      defaultIcon: <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    neutral: {
      bg: "bg-status-neutralBg text-status-neutral border-status-neutral/25",
      defaultIcon: <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
  };

  const current = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide select-none",
        current.bg,
        className
      )}
    >
      <span className="shrink-0">{icon || current.defaultIcon}</span>
      <span>{children || label}</span>
    </span>
  );
};
