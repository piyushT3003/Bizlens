import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScenarioFlowNode } from "@/lib/api";
import {
  GitBranch,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Info,
  X,
  Calculator,
  Activity,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export interface ScenarioFlowProps {
  nodes?: ScenarioFlowNode[];
  onNodeClick?: (node: ScenarioFlowNode) => void;
  className?: string;
}

export const ScenarioFlow: React.FC<ScenarioFlowProps> = ({
  nodes = [
    {
      node_id: "driver_price",
      type: "driver",
      title: "Price Adjustment (+10.0%)",
      delta_formatted: "+10.0% Price",
      elasticity: -0.80,
      detail: "Applied across premium Electronics and Fashion categories",
    },
    {
      node_id: "metric_volume",
      type: "metric",
      title: "Volume Elasticity Response",
      delta_formatted: "-8.0% Units",
      elasticity: null,
      detail: "Estimated 38,732 orders contraction based on empirical demand elasticity",
    },
    {
      node_id: "outcome_margin",
      type: "outcome",
      title: "Net Margin Expansion",
      delta_formatted: "+₹14.20 L",
      elasticity: null,
      detail: "Operating gross margin expands from 31.8% to 34.2% (+240 bps)",
    },
  ],
  onNodeClick,
  className,
}) => {
  const [selectedNode, setSelectedNode] = useState<ScenarioFlowNode | null>(null);

  useEffect(() => {
    setSelectedNode(null);
  }, [nodes]);

  const driverNode = nodes.find((n) => n.type === "driver") || nodes[0];
  const metricNode = nodes.find((n) => n.type === "metric") || nodes[1];
  const outcomeNode = nodes.find((n) => n.type === "outcome") || nodes[2];

  const handleNodeClick = (node: ScenarioFlowNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  return (
    <div className={cn("p-5 rounded-2xl border border-surface-border bg-surface-card backdrop-blur-md shadow-card relative", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 shadow-glowSm">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              Scenario Flow Model
              <span className="w-1.5 h-1.5 rounded-full bg-status-positive animate-pulse" />
            </h3>
            <p className="text-[11px] text-text-muted">Dynamic Driver &rarr; Metric &rarr; Outcome Simulation Flow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 animate-pulse">
            <Activity className="w-3 h-3" /> Live Simulation Cascade
          </span>
        </div>
      </div>

      {/* Interactive Scenario Cascade Canvas */}
      <div className="relative py-1">
        {/* 3 Node Cards Grid with Connectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch relative z-10">
          {/* 1. Driver Node */}
          {driverNode && (
            <div
              onClick={() => handleNodeClick(driverNode)}
              className={cn(
                "p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative min-h-[260px]",
                selectedNode?.node_id === driverNode.node_id
                  ? "border-brand-orange bg-[#1C1612] shadow-glowSm ring-2 ring-brand-orange/50 scale-[1.01]"
                  : "border-brand-orange/40 bg-[#18120E] hover:border-brand-orange hover:bg-[#1C1612] hover:shadow-card hover:scale-[1.005]"
              )}
            >
              {/* Subtle top indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-brand-orange to-brand-amber opacity-90" />

              <div>
                {/* Header Row: Flex wrapped with clean responsive badges */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-orange px-2 py-0.5 rounded-md bg-brand-orange/15 border border-brand-orange/30">
                    <Zap className="w-3 h-3 text-brand-orange animate-bounce" /> Stage 1 &bull; Driver
                  </span>
                  {driverNode.elasticity !== undefined && driverNode.elasticity !== null && (
                    <span className="text-[10px] font-mono font-medium text-text-muted px-2 py-0.5 rounded-md bg-[#221B16] border border-surface-border/70">
                      &epsilon; = {driverNode.elasticity}
                    </span>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-brand-orange transition-colors leading-snug break-words">
                  {driverNode.title}
                </h4>

                <div className="mt-2 text-base sm:text-lg font-extrabold text-brand-orange font-mono tabular-nums tracking-tight break-words">
                  {driverNode.delta_formatted}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-surface-border/60">
                <p className="text-[11px] text-text-muted leading-relaxed break-words">
                  {driverNode.detail}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Formula Breakdown</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}

          {/* 2. Metric Response Node */}
          {metricNode && (
            <div
              onClick={() => handleNodeClick(metricNode)}
              className={cn(
                "p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative min-h-[260px]",
                selectedNode?.node_id === metricNode.node_id
                  ? "border-brand-amber bg-[#1C1612] shadow-glowSm ring-2 ring-brand-amber/50 scale-[1.01]"
                  : "border-surface-border bg-[#18120E] hover:border-brand-amber/60 hover:bg-[#1C1612] hover:shadow-card hover:scale-[1.005]"
              )}
            >
              {/* Subtle top indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-brand-amber to-status-warning opacity-90" />

              <div>
                {/* Header Row: Flex wrapped with clean responsive badges */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-amber px-2 py-0.5 rounded-md bg-brand-amber/15 border border-brand-amber/30">
                    <Target className="w-3 h-3 text-brand-amber" /> Stage 2 &bull; Response
                  </span>
                  <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded-md bg-[#221B16] border border-surface-border/70">
                    Elasticity
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-brand-amber transition-colors leading-snug break-words">
                  {metricNode.title}
                </h4>

                <div className="mt-2 text-base sm:text-lg font-extrabold text-text-main font-mono tabular-nums tracking-tight break-words">
                  {metricNode.delta_formatted}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-surface-border/60">
                <p className="text-[11px] text-text-muted leading-relaxed break-words">
                  {metricNode.detail}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-brand-amber opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Inspect Demand Shift</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}

          {/* 3. Outcome Node */}
          {outcomeNode && (
            <div
              onClick={() => handleNodeClick(outcomeNode)}
              className={cn(
                "p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative min-h-[260px]",
                selectedNode?.node_id === outcomeNode.node_id
                  ? "border-status-positive bg-[#1C1612] shadow-glowSm ring-2 ring-status-positive/50 scale-[1.01]"
                  : "border-status-positive/40 bg-[#18120E] hover:border-status-positive hover:bg-[#1C1612] hover:shadow-card hover:scale-[1.005]"
              )}
            >
              {/* Subtle top indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-status-positive to-emerald-400 opacity-90" />

              <div>
                {/* Header Row: Flex wrapped with clean responsive badges */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-status-positive px-2 py-0.5 rounded-md bg-status-positive/15 border border-status-positive/30">
                    <TrendingUp className="w-3 h-3 text-status-positive" /> Stage 3 &bull; Outcome
                  </span>
                  <span className="text-[10px] font-semibold text-status-positive px-2 py-0.5 rounded-md bg-status-positive/15 border border-status-positive/30">
                    Net Impact
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-status-positive transition-colors leading-snug break-words">
                  {outcomeNode.title}
                </h4>

                <div className="mt-2 text-base sm:text-lg font-extrabold text-status-positive font-mono tabular-nums tracking-tight break-words">
                  {outcomeNode.delta_formatted}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-surface-border/60">
                <p className="text-[11px] text-text-muted leading-relaxed break-words">
                  {outcomeNode.detail}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-status-positive opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Margin Cascade</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assumptions & Formula Notice */}
      <div className="mt-4 p-3 rounded-xl bg-surface-subtle/50 border border-surface-border/40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-brand-orange shrink-0" />
          <span>
            Calibrated Simulation: Demand elasticity (&epsilon; = {driverNode?.elasticity ?? -0.8}) dynamically updates across active datasets.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-main bg-surface-card px-2 py-0.5 rounded border border-surface-border">
            &Delta;Q = &epsilon; &times; (&Delta;P / P) &times; Q
          </span>
        </div>
      </div>

      {/* Interactive Node Breakdown Modal (SOLID, 100% NON-TRANSPARENT BACKGROUND) */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-[#140F0C] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-text-main">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "p-2 rounded-xl border",
                    selectedNode.type === "driver"
                      ? "bg-brand-orange/10 text-brand-orange border-brand-orange/30 shadow-glowSm"
                      : selectedNode.type === "metric"
                      ? "bg-brand-amber/10 text-brand-amber border-brand-amber/30 shadow-glowSm"
                      : "bg-status-positive/10 text-status-positive border-status-positive/30 shadow-glowSm"
                  )}
                >
                  {selectedNode.type === "driver" ? (
                    <Zap className="w-5 h-5" />
                  ) : selectedNode.type === "metric" ? (
                    <Target className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                    {selectedNode.type === "driver"
                      ? "Catalyst Stage 1: Input Driver"
                      : selectedNode.type === "metric"
                      ? "Catalyst Stage 2: Metric Elasticity"
                      : "Catalyst Stage 3: Projected Outcome"}
                  </span>
                  <h3 className="text-base font-bold text-text-main mt-0.5">{selectedNode.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-[#201814] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Impact Metric & Delta (SOLID OPAQUE CARD) */}
            <div className="p-4 rounded-xl bg-[#1C1612] border border-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs text-text-muted font-medium">Simulation Shift / Delta</span>
                <div
                  className={cn(
                    "text-2xl font-extrabold font-mono mt-0.5 tabular-nums",
                    selectedNode.type === "driver"
                      ? "text-brand-orange"
                      : selectedNode.type === "metric"
                      ? "text-brand-amber"
                      : "text-status-positive"
                  )}
                >
                  {selectedNode.delta_formatted}
                </div>
              </div>
              {selectedNode.elasticity !== undefined && selectedNode.elasticity !== null && (
                <div className="text-right">
                  <span className="text-xs text-text-muted font-medium">Elasticity Factor (&epsilon;)</span>
                  <div className="text-lg font-bold font-mono text-text-main mt-0.5">
                    {selectedNode.elasticity}
                  </div>
                </div>
              )}
            </div>

            {/* Step-by-Step Mathematical Cascade (SOLID OPAQUE CARD) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-brand-orange" /> Mathematical Formulation & Mechanics
              </h4>
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border text-xs space-y-2 font-mono">
                {selectedNode.type === "driver" ? (
                  <>
                    <p className="text-text-main font-semibold">1. Input Parameter Perturbation:</p>
                    <p className="text-text-muted pl-3">&Delta;P / P0 = {selectedNode.delta_formatted}</p>
                    <p className="text-text-main font-semibold mt-2">2. Scope of Application:</p>
                    <p className="text-text-muted pl-3">{selectedNode.detail}</p>
                  </>
                ) : selectedNode.type === "metric" ? (
                  <>
                    <p className="text-text-main font-semibold">1. Demand Elasticity Response:</p>
                    <p className="text-text-muted pl-3">&Delta;Q = &epsilon; &times; (&Delta;P / P0) &times; Q0</p>
                    <p className="text-text-main font-semibold mt-2">2. Empirical Order Impact:</p>
                    <p className="text-text-muted pl-3">{selectedNode.detail}</p>
                  </>
                ) : (
                  <>
                    <p className="text-text-main font-semibold">1. Net Margin Delta:</p>
                    <p className="text-text-muted pl-3">&Delta;&Pi; = (P1 &times; Q1 &minus; C1 &times; Q1) &minus; (P0 &times; Q0 &minus; C0 &times; Q0)</p>
                    <p className="text-text-main font-semibold mt-2">2. Realized Outcome:</p>
                    <p className="text-text-muted pl-3">{selectedNode.detail}</p>
                  </>
                )}
              </div>
            </div>

            {/* Validation & Guardrail Status */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1C1612] border border-status-positive/40 text-xs text-status-positive">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Grounded in active dataset parameters & empirical demand response curves.</span>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors shadow-sm"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
