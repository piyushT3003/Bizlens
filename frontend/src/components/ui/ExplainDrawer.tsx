import React from "react";
import { cn } from "@/lib/utils";
import { X, Sparkles, ExternalLink, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface ExplainFact {
  label: string;
  value: string;
  sublabel?: string;
  badge?: string;
  highlight?: boolean;
}

export interface ExplainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partTitle: string;
  datasetName: string;
  scopeBadge?: string;
  executiveSummary: string;
  facts: ExplainFact[];
  interpretation: string;
  recommendations: string[];
  onViewEvidence?: () => void;
  onAskBizlens?: () => void;
}

export const ExplainDrawer: React.FC<ExplainDrawerProps> = ({
  isOpen,
  onClose,
  partTitle,
  datasetName,
  scopeBadge = "Deterministic DuckDB",
  executiveSummary,
  facts,
  interpretation,
  recommendations,
  onViewEvidence,
  onAskBizlens,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg h-full bg-surface-drawer border-l border-brand-orange/40 p-6 overflow-y-auto flex flex-col justify-between shadow-2xl animate-slideLeft custom-scrollbar text-text-main"
        role="dialog"
        aria-modal="true"
        aria-label={`AI Intelligence Summary - ${partTitle}`}
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange shadow-glowSm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-main">{partTitle}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                    Google Gemini AI
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  AI Analytical Summary &bull; {datasetName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-tileHover transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope & Grounding Badge (SOLID OPAQUE PANEL) */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-tile border border-surface-border text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <CheckCircle2 className="w-3.5 h-3.5 text-status-positive" />
              <span>Grounding Engine:</span>
              <strong className="text-text-main font-mono">{scopeBadge}</strong>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/20 font-semibold">
              RULES.md Verified
            </span>
          </div>

          {/* Executive Summary (SOLID OPAQUE CARD) */}
          <div className="p-4 rounded-xl bg-surface-tile border border-brand-orange/30 shadow-sm space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange block">
              Executive Brief
            </span>
            <p className="text-xs text-text-main leading-relaxed">
              {executiveSummary}
            </p>
          </div>

          {/* SECTION 1: CALCULATED FACT (SOLID OPAQUE CARD) */}
          <div className="p-4 rounded-xl bg-surface-tile border border-surface-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                [CALCULATED FACT]
              </span>
              <span className="text-[11px] font-mono text-text-muted">100% In-Memory DuckDB</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              {facts.map((fact, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-2.5 rounded-lg border flex flex-col justify-between",
                    fact.highlight
                      ? "border-brand-orange/50 bg-surface-tileElevated"
                      : "border-surface-border/60 bg-surface-tileSubtle"
                  )}
                >
                  <span className="text-[10px] text-text-muted block truncate">{fact.label}</span>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <strong className={cn("text-xs truncate", fact.highlight ? "text-brand-orange font-extrabold" : "text-text-main")}>
                      {fact.value}
                    </strong>
                    {fact.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-sans font-bold bg-surface-tileHover text-text-muted border border-surface-border shrink-0">
                        {fact.badge}
                      </span>
                    )}
                  </div>
                  {fact.sublabel && (
                    <span className="text-[9px] text-text-muted mt-0.5 truncate block">{fact.sublabel}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: INTERPRETATION (SOLID OPAQUE CARD) */}
          <div className="p-4 rounded-xl bg-surface-tile border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                [INTERPRETATION]
              </span>
              <span className="text-[11px] font-mono text-text-muted">Analytical Synthesis</span>
            </div>
            <p className="text-xs text-text-main leading-relaxed">
              {interpretation}
            </p>
          </div>

          {/* SECTION 3: RECOMMENDATION (SOLID OPAQUE CARD) */}
          <div className="p-4 rounded-xl bg-surface-tile border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                [RECOMMENDATION]
              </span>
              <span className="text-[11px] font-mono text-text-muted">Grounded Options</span>
            </div>
            <ul className="space-y-1.5 text-xs text-text-muted list-disc list-inside">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="text-text-main">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Drawer Actions */}
        <div className="mt-6 pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
          {onViewEvidence && (
            <button
              type="button"
              onClick={onViewEvidence}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-surface-border hover:border-brand-orange/40 bg-surface-tile hover:bg-surface-tileHover text-text-muted hover:text-text-main transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
              <span>View Calculation Lineage</span>
            </button>
          )}

          <div className="w-full sm:w-auto flex items-center gap-2">
            {onAskBizlens && (
              <button
                type="button"
                onClick={onAskBizlens}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-brand-orange/15 border border-brand-orange/40 hover:bg-brand-orange/25 text-brand-orange text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ask BizLens</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-surface-tileSubtle hover:bg-surface-tileHover border border-surface-border text-text-main font-semibold transition-colors text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
