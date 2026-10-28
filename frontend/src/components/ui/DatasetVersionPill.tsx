import React from "react";
import { cn } from "@/lib/utils";
import { Database, ChevronDown } from "lucide-react";

export interface DatasetVersionPillProps {
  datasetName?: string;
  versionLabel?: string;
  qualityScore?: number;
  onClick?: () => void;
  className?: string;
}

export const DatasetVersionPill: React.FC<DatasetVersionPillProps> = ({
  datasetName = "No active dataset",
  versionLabel = "v1",
  qualityScore,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-surface-border bg-surface-card hover:bg-surface-subtle hover:border-surface-borderHover transition-all text-xs font-medium text-text-main outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
        className
      )}
      title="Active dataset & version"
    >
      <Database className="w-3.5 h-3.5 text-brand-orange shrink-0" />
      <span className="font-semibold truncate max-w-[130px]">{datasetName}</span>
      <span className="px-1.5 py-0.5 rounded bg-brand-orange/15 text-brand-orange text-[10px] font-bold">
        {versionLabel}
      </span>
      {qualityScore !== undefined && (
        <span className="text-[11px] text-text-muted border-l border-surface-border pl-1.5 tabular-nums">
          Score: <strong className="text-text-main">{qualityScore.toFixed(0)}%</strong>
        </span>
      )}
      <ChevronDown className="w-3 h-3 text-text-muted ml-0.5" />
    </button>
  );
};
