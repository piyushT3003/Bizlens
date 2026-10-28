import React, { useState } from "react";
import { WaterfallStep } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Info, X, CheckCircle2, Sparkles, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterfallChartProps {
  steps: WaterfallStep[];
  onStepClick?: (step: WaterfallStep) => void;
  activeDatasetName?: string;
  className?: string;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  steps,
  onStepClick,
  activeDatasetName = "Current Dataset",
  className = "",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedStep, setSelectedStep] = useState<WaterfallStep | null>(null);

  if (!steps || steps.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-text-muted border border-surface-border rounded-2xl bg-surface-card">
        No waterfall variance data available.
      </div>
    );
  }

  // Calculate scaling bounds
  let maxVal = Math.max(...steps.map((s) => s.running_total), ...steps.map((s) => Math.abs(s.delta_value)));
  let minVal = 0;
  for (const s of steps) {
    if (s.running_total < minVal) minVal = s.running_total;
  }
  // Add 15% headroom for labels
  const range = (maxVal - minVal) * 1.25 || 1;

  const svgWidth = 740;
  const svgHeight = 280;
  const chartTop = 35;
  const chartBottom = svgHeight - 45;
  const chartHeight = chartBottom - chartTop;

  const barCount = steps.length;
  const barWidth = Math.min(65, (svgWidth - 60) / barCount - 16);
  const gap = ((svgWidth - 60) - barWidth * barCount) / (barCount + 1);

  const getY = (val: number) => {
    const norm = (val - minVal) / range;
    return chartBottom - norm * chartHeight;
  };

  const handleStepSelect = (step: WaterfallStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  return (
    <div className={`p-5 rounded-2xl border border-surface-border bg-surface-card backdrop-blur-md relative overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-surface-border">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-orange inline-block" />
            Financial Variance Waterfall &bull; Attribution Bridge
            <span className="text-[10px] font-normal text-text-muted px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border ml-1">
              Click bar to inspect summary
            </span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Bridge decomposition: Baseline &rarr; Price Effect &rarr; Volume Shifts &rarr; Net Realized Outcome
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-status-positive inline-block" /> Gain
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-status-critical inline-block" /> Drag
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-brand-orange inline-block" /> Net Outcome
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 select-none">
          <defs>
            <linearGradient id="wf-emerald" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="wf-rose" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="wf-orange" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#ff7a00" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d96200" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="wf-slate" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Zero baseline horizontal rule */}
          <line
            x1="30"
            y1={getY(0)}
            x2={svgWidth - 20}
            y2={getY(0)}
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeDasharray="4 4"
          />

          {steps.map((step, idx) => {
            const x = 35 + gap + idx * (barWidth + gap);

            let barY = 0;
            let barH = 0;
            let fill = "url(#wf-slate)";

            if (step.step_type === "baseline") {
              barY = getY(step.delta_value);
              barH = Math.max(4, chartBottom - barY);
              fill = "url(#wf-slate)";
            } else if (step.step_type === "result") {
              barY = getY(step.delta_value);
              barH = Math.max(4, chartBottom - barY);
              fill = "url(#wf-orange)";
            } else {
              // Intermediate driver delta step
              const prevRunning = idx > 0 ? steps[idx - 1].running_total : 0;
              const currRunning = step.running_total;
              const topY = getY(Math.max(prevRunning, currRunning));
              const botY = getY(Math.min(prevRunning, currRunning));
              barY = topY;
              barH = Math.max(4, botY - topY);
              fill = step.delta_value >= 0 ? "url(#wf-emerald)" : "url(#wf-rose)";
            }

            // Connector dashed line to next bar
            const nextStep = idx < steps.length - 1 ? steps[idx + 1] : null;
            const connectorY = getY(step.running_total);

            const isHovered = hoveredIdx === idx;
            const isSelected = selectedStep?.label === step.label;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleStepSelect(step)}
                className="cursor-pointer transition-transform duration-200"
                style={{
                  transform: isHovered || isSelected ? "translateY(-3px)" : "none",
                }}
              >
                {/* Connector line to next bar */}
                {nextStep && (
                  <line
                    x1={x + barWidth}
                    y1={connectorY}
                    x2={x + barWidth + gap}
                    y2={connectorY}
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeDasharray="2 2"
                    strokeWidth="1.5"
                  />
                )}

                {/* Step Bar */}
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  fill={fill}
                  className={cn(
                    "transition-all duration-200",
                    isSelected
                      ? "filter drop-shadow-md stroke-2 stroke-white"
                      : isHovered
                      ? "filter brightness-125 stroke-2 stroke-white/50"
                      : ""
                  )}
                />

                {/* Top Delta / Value Label */}
                <text
                  x={x + barWidth / 2}
                  y={Math.max(14, barY - 7)}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-mono font-bold fill-current",
                    isSelected ? "fill-brand-orange" : "fill-text-main"
                  )}
                >
                  {step.step_type === "baseline" || step.step_type === "result"
                    ? step.running_formatted
                    : `${step.delta_value >= 0 ? "+" : ""}${step.delta_formatted}`}
                </text>

                {/* Step Name X-Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartBottom + 18}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-semibold fill-current transition-colors",
                    isSelected ? "fill-brand-orange font-bold" : "fill-text-muted"
                  )}
                >
                  {step.label.length > 13 ? `${step.label.slice(0, 12)}…` : step.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hovered Step Inspector */}
      {hoveredIdx !== null && steps[hoveredIdx] && !selectedStep && (
        <div className="mt-2.5 p-3 rounded-xl bg-surface-subtle/80 border border-surface-border flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-main">{steps[hoveredIdx].label}</span>
            <span className="text-text-muted">&bull;</span>
            <span className="font-mono text-text-muted">
              Running Total: <strong className="text-text-main">{steps[hoveredIdx].running_formatted}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono font-bold">
            {steps[hoveredIdx].step_type !== "baseline" && steps[hoveredIdx].step_type !== "result" && (
              <span
                className={
                  steps[hoveredIdx].delta_value >= 0 ? "text-status-positive" : "text-status-critical"
                }
              >
                Variance Impact: {steps[hoveredIdx].delta_value >= 0 ? "+" : ""}
                {steps[hoveredIdx].delta_formatted}
              </span>
            )}
            <span className="text-[10px] text-text-muted font-normal ml-2">Click to view details</span>
          </div>
        </div>
      )}

      {/* Step Detail Summary Modal (SOLID, 100% NON-TRANSPARENT BACKGROUND) */}
      {selectedStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-[#140F0C] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-text-main">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/30 shadow-glowSm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-orange px-1.5 py-0.5 rounded bg-brand-orange/10 border border-brand-orange/20">
                      Attribution Step: {selectedStep.step_type.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{activeDatasetName}</span>
                  </div>
                  <h3 className="text-base font-bold text-text-main mt-1">
                    {selectedStep.label} &bull; Bridge Factor Summary
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedStep(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-[#201814] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Impact Metric Grid (SOLID OPAQUE TILES) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Factor Delta</span>
                <div
                  className={cn(
                    "text-xl font-extrabold font-mono mt-1",
                    selectedStep.delta_value >= 0 ? "text-status-positive" : "text-status-critical"
                  )}
                >
                  {selectedStep.delta_value >= 0 ? "+" : ""}
                  {selectedStep.delta_formatted}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Cumulative Baseline</span>
                <div className="text-xl font-extrabold font-mono text-brand-orange mt-1">
                  {selectedStep.running_formatted}
                </div>
              </div>
            </div>

            {/* Executive Explanation (SOLID OPAQUE CARD) */}
            <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Financial Attribution Mechanics</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                In {activeDatasetName}, the factor <strong>{selectedStep.label}</strong> contributed{" "}
                <strong className={selectedStep.delta_value >= 0 ? "text-status-positive font-mono" : "text-status-critical font-mono"}>
                  {selectedStep.delta_formatted}
                </strong>{" "}
                to the period's net operating variance, resulting in a cumulative running financial total of{" "}
                <strong className="text-text-main font-mono">{selectedStep.running_formatted}</strong>. This bridges prior period performance directly to realized quarter results.
              </p>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStep(null)}
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
