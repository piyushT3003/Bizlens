import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge";
import { AlertCircle, CheckCircle, ShieldCheck, Sparkles } from "lucide-react";

export interface KpiCardProps {
  metricId?: string;
  label?: string;
  title?: string;
  value?: string | number;
  deltaText?: string;
  change?: number;
  changeLabel?: string;
  status?: StatusType;
  loading?: boolean;
  unavailable?: { missingRole: string };
  calculationSource?: string;
  onClick?: () => void;
  onViewEvidence?: () => void;
  onExplain?: () => void;
  firstLoad?: boolean;
  stagger?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  metricId,
  label,
  title,
  value,
  deltaText,
  change,
  changeLabel,
  status = "neutral",
  loading = false,
  unavailable,
  calculationSource,
  onClick,
  onViewEvidence,
  onExplain,
  firstLoad = false,
  stagger,
}) => {
  const [displayValue, setDisplayValue] = useState<string | number>(value ?? "--");
  const displayTitle = title || label || metricId || "Metric";

  useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(value);
    }
  }, [value]);

  const computedDeltaText =
    deltaText ||
    (change !== undefined
      ? `${change > 0 ? "+" : ""}${change}%`
      : undefined);

  if (loading) {
    return (
      <GlassCard className="p-5 flex flex-col justify-between min-h-[148px] h-full animate-pulse">
        <div className="h-4 w-28 bg-surface-border rounded mb-3"></div>
        <div className="h-8 w-36 bg-surface-border rounded mb-2"></div>
        <div className="h-4 w-20 bg-surface-border rounded"></div>
      </GlassCard>
    );
  }

  if (unavailable) {
    return (
      <GlassCard className="p-5 flex flex-col justify-between min-h-[148px] h-full border-dashed border-surface-border">
        <div>
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
            {displayTitle}
          </span>
          <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
            <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />
            <span>
              Needs mapped <strong className="text-brand-orange">{unavailable.missingRole}</strong>
            </span>
          </div>
        </div>
        <div className="mt-4 text-xs text-brand-orange hover:underline cursor-pointer">
          Review column mapping &rarr;
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      onClick={onClick}
      hoverLift={!!onClick}
      tilt={true}
      hoverGlow={true}
      slide="up"
      stagger={stagger}
      className={cn(
        "p-5 flex flex-col justify-between min-h-[148px] h-full transition-all card-3d",
        onClick && "cursor-pointer group"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted group-hover:text-brand-orange transition-colors">
          {displayTitle}
        </span>
        {computedDeltaText && status && (
          <StatusBadge status={status} label={computedDeltaText} />
        )}
      </div>

      <div className="mt-3">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-text-main tabular-nums">
          {displayValue}
        </span>
      </div>

      <div className="mt-3 text-xs text-text-muted flex items-center justify-between gap-2">
        <span className="truncate">{changeLabel || "vs. previous period"}</span>

        <div className="flex items-center gap-1.5 shrink-0 relative z-20">
          {onViewEvidence && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewEvidence();
              }}
              className="p-1 rounded-md border border-surface-border hover:border-brand-orange/40 bg-surface-subtle/80 hover:bg-brand-orange/15 text-text-muted hover:text-brand-orange transition-all cursor-pointer"
              title="View Calculation Lineage & Evidence (Deterministic DuckDB)"
              aria-label="View Calculation Lineage & Evidence"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
            </button>
          )}

          {onExplain && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExplain();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-brand-orange/30 hover:border-brand-orange/60 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-[11px] font-medium transition-all cursor-pointer"
              title="Explain Metric with AI Intelligence"
              aria-label="Explain Metric"
            >
              <Sparkles className="w-3 h-3 text-brand-orange" />
              <span>Explain</span>
            </button>
          )}

          {!onViewEvidence && !onExplain && calculationSource && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded font-mono"
              title={calculationSource}
            >
              <CheckCircle className="w-3 h-3" />
              Deterministic
            </span>
          )}

          {onClick && !onViewEvidence && !onExplain && !calculationSource && (
            <span className="opacity-0 group-hover:opacity-100 text-brand-orange transition-opacity">
              Drill down &rarr;
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
