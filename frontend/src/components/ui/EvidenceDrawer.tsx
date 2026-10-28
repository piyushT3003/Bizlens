import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface LineageStep {
  kind: "dataset" | "version" | "mapping" | "filter" | "calculation" | "result" | "explanation";
  ref: string;
  detail: string;
}

export interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resultId?: string;
  metricLabel?: string;
  metricName?: string;
  formula?: string;
  formulaSql?: string;
  filters?: string;
  registryVersion?: string;
  datasetVersion?: string;
  executionMs?: number;
  contentHash?: string;
  factsSnapshot?: any;
  lineageSteps?: LineageStep[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  resultId = "res_001",
  metricLabel,
  metricName,
  formula,
  formulaSql,
  filters = "None (All records included)",
  registryVersion = "v1.0",
  datasetVersion,
  executionMs,
  contentHash,
  factsSnapshot,
  lineageSteps = [
    { kind: "dataset", ref: "ds_42", detail: "Demo Sales Dataset (Indian Retailers)" },
    { kind: "version", ref: "v1", detail: "Parquet snapshot content_hash: 8f4a1..." },
    { kind: "mapping", ref: "map_01", detail: "price -> price, qty -> quantity, disc -> discount" },
    { kind: "calculation", ref: "reg_rev", detail: "Engine executed DuckDB columnar aggregation" },
    { kind: "result", ref: "fact_01", detail: "Verified output formatted as ₹1.24 Cr" },
  ],
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const mainEl = document.querySelector("main");
      const prevMainOverflow = mainEl ? mainEl.style.overflow : "";
      if (mainEl) mainEl.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        if (mainEl) mainEl.style.overflow = prevMainOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(resultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md h-full bg-surface-drawer border-l border-brand-orange/40 p-6 overflow-y-auto flex flex-col justify-between shadow-2xl animate-slideLeft text-text-main"
        role="dialog"
        aria-modal="true"
        aria-label="Evidence & Lineage Drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              <h3 className="text-base font-bold text-text-main">Calculation Evidence</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-tileHover micro-press transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metric Overview (SOLID OPAQUE CARD) */}
          <div className="mt-4 p-3.5 rounded-xl bg-surface-tile border border-surface-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Target Metric</span>
            <div className="text-lg font-bold text-text-main mt-0.5">{metricLabel || metricName || "Total Revenue"}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>Result Reference: <code className="text-brand-orange font-mono">{resultId}</code></span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-brand-orange transition-colors micro-press"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-positive" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Lineage Details */}
          <div className="mt-5 space-y-4">
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Formula</span>
              <div className="mt-1 p-2.5 rounded-lg bg-surface-tile border border-surface-border font-mono text-xs text-text-main overflow-x-auto">
                {formula || formulaSql || "SUM(price * quantity * (1 - discount))"}
              </div>
              <span className="text-[10px] text-text-muted mt-0.5 block">Registry Version: {registryVersion || datasetVersion || "v1.0"}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Applied Filters</span>
              <div className="mt-1 p-2.5 rounded-lg bg-surface-tile border border-surface-border text-xs text-text-main">
                {filters}
              </div>
            </div>

            {/* Lineage Steps Timeline */}
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Lineage Chain</span>
              <div className="mt-2 pl-3 border-l-2 border-brand-orange/30 space-y-3">
                {lineageSteps.map((step, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-brand-orange" />
                    <div className="text-xs font-bold uppercase text-brand-orange tracking-wider">{step.kind}</div>
                    <div className="text-xs text-text-main mt-0.5">{step.detail}</div>
                    <div className="text-[10px] font-mono text-text-muted">ref: {step.ref}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-surface-border">
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
            Close Evidence Drawer
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
};
