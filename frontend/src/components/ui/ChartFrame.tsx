import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { SmoothLoader } from "@/components/ui/SmoothLoader";
import { Sparkles, Table as TableIcon, BarChart2, ShieldCheck, AlertCircle } from "lucide-react";

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  onExplain?: () => void;
  onViewEvidence?: () => void;
  children: React.ReactNode;
  tableAlternative?: React.ReactNode;
  headerAction?: React.ReactNode;
  loading?: boolean;
  error?: string;
  unavailable?: { missingRole: string };
  className?: string;
}

export const ChartFrame: React.FC<ChartFrameProps> = ({
  title,
  subtitle,
  onExplain,
  onViewEvidence,
  children,
  tableAlternative,
  headerAction,
  loading = false,
  error,
  unavailable,
  className,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <GlassCard slide="up" className={cn("p-5 flex flex-col justify-between overflow-hidden card-3d gloss-sheen h-full", className)}>
      {/* Header bar: elevated z-index and isolated pointer events so 3D elements never interfere with clickability */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-border">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-main">{title}</h3>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>

        <div className="relative z-30 flex items-center gap-1.5 shrink-0">
          {headerAction}
          {tableAlternative && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTable((prev) => !prev);
              }}
              className={cn(
                "p-1.5 rounded-lg border text-xs font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-orange cursor-pointer",
                showTable
                  ? "bg-brand-orange/15 border-brand-orange/40 text-brand-orange"
                  : "border-surface-border hover:bg-surface-subtle text-text-muted hover:text-text-main"
              )}
              title={showTable ? "Switch to Chart view" : "Switch to Table view"}
            >
              {showTable ? <BarChart2 className="w-4 h-4" /> : <TableIcon className="w-4 h-4" />}
            </button>
          )}

          {onViewEvidence && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewEvidence();
              }}
              className="p-1.5 rounded-lg border border-surface-border hover:bg-surface-subtle text-text-muted hover:text-text-main transition-colors text-xs font-medium cursor-pointer"
              title="View Calculation Lineage & Evidence"
            >
              <ShieldCheck className="w-4 h-4 text-brand-orange" />
            </button>
          )}

          {onExplain && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExplain();
              }}
              icon={<Sparkles className="w-3.5 h-3.5 text-brand-orange" />}
              className="text-xs cursor-pointer"
            >
              Explain
            </Button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="mt-4 min-h-[220px] flex items-center justify-center relative z-10">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-main/75 backdrop-blur-md rounded-xl z-10">
            <SmoothLoader size="sm" label="Computing Visual Intelligence..." sublabel="DuckDB Vectorized Aggregation" />
          </div>
        )}

        {unavailable ? (
          <div className="text-center p-6 text-xs text-text-muted flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6 text-status-warning" />
            <span>Chart unavailable: Needs <strong className="text-brand-orange">{unavailable.missingRole}</strong> column</span>
          </div>
        ) : error ? (
          <div className="text-center p-6 text-xs text-status-critical">
            Failed to render chart: {error}
          </div>
        ) : showTable && tableAlternative ? (
          <div className="w-full h-full overflow-auto max-h-[300px]">
            {tableAlternative}
          </div>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </GlassCard>
  );
};
