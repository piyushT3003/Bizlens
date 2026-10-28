import React, { useState } from "react";
import { Sparkles, StopCircle, ChevronDown, CheckCircle2, Cpu, Database, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  step: "analyzing" | "computing" | "explaining" | "verifying" | "reasoning" | "formatting";
  label: string;
  progress: number;
}

export interface ThinkingCardProps {
  status?: ThinkingStep | null;
  elapsedSeconds?: number;
  isStreaming?: boolean;
  onStop?: () => void;
  completedDurationSec?: number;
  modelName?: string;
  intent?: string;
  guardrailPassed?: boolean;
  isCompleted?: boolean;
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({
  status,
  elapsedSeconds = 0,
  isStreaming = false,
  onStop,
  completedDurationSec = 1.1,
  modelName = "Google Gemini 3.5 Flash",
  intent = "Auto-routed",
  guardrailPassed = true,
  isCompleted = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. LIVE STREAMING / THINKING STATE
  if (isStreaming) {
    const currentProgress = status?.progress ?? 35;
    const currentLabel =
      status?.label || "Reasoning with Google Gemini & DuckDB Intelligence...";

    return (
      <div className="w-full rounded-2xl border border-brand-orange/40 bg-surface-card/90 p-4 space-y-3.5 relative overflow-hidden backdrop-blur-xl shadow-glowSm animate-slide-up">
        {/* Shimmering top accent gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange to-transparent animate-pulse" />

        {/* Header: Sparkle + "Thinking..." + Timer + Stop Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-brand-orange/40 opacity-75" />
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-orange via-amber-500 to-amber-400 text-white flex items-center justify-center shadow-glowSm">
                <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>

            <div className="flex items-baseline gap-2 truncate">
              <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-amber bg-clip-text text-transparent font-bold text-sm tracking-wide">
                Thinking...
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {elapsedSeconds.toFixed(1)}s
              </span>
            </div>
          </div>

          {onStop && (
            <button
              onClick={onStop}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-subtle border border-surface-border hover:border-brand-orange/50 text-text-muted hover:text-text-main transition-all flex items-center gap-1.5 shadow-sm"
              title="Stop generation"
            >
              <StopCircle className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px]">Stop</span>
            </button>
          )}
        </div>

        {/* Dynamic Step Status & Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-main font-medium flex items-center gap-1.5 truncate">
              {status?.step === "computing" ? (
                <Database className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              ) : status?.step === "reasoning" ? (
                <Zap className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              ) : status?.step === "verifying" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-status-positive shrink-0" />
              ) : (
                <Cpu className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              )}
              <span className="truncate">{currentLabel}</span>
            </span>
            <span className="text-[11px] font-mono text-brand-orange shrink-0 pl-2">
              {currentProgress}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>

        {/* Shimmering Neural Tokens Waveform */}
        <div className="space-y-1.5 pt-1">
          <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-brand-orange/20 via-amber-500/10 to-transparent animate-pulse" />
          <div
            className="h-2 w-3/5 rounded-full bg-gradient-to-r from-brand-orange/15 via-amber-500/5 to-transparent animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
        </div>
      </div>
    );
  }

  // 2. COMPLETED COLLAPSIBLE THOUGHT BADGE
  if (isCompleted) {
    return (
      <div className="rounded-xl border border-surface-border/70 bg-surface-subtle/30 overflow-hidden text-xs transition-all mb-3.5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3.5 py-2 flex items-center justify-between text-text-muted hover:text-text-main transition-colors group"
        >
          <div className="flex items-center gap-2 font-mono text-[11px] truncate pr-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-orange group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-semibold text-text-main">
              Thought for {completedDurationSec.toFixed(1)}s
            </span>
            <span className="text-text-muted font-sans text-[10px] hidden sm:inline truncate">
              • {intent === "general_inquiry" ? "Conversational Gemini Synthesis" : "DuckDB Fact Certification & Audit"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-text-muted shrink-0">
            <span>{isExpanded ? "Hide" : "View thought process"}</span>
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180")}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="px-3.5 pb-3 pt-2 border-t border-surface-border/40 space-y-2 text-[11px] bg-surface-subtle/60 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card border border-surface-border/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-status-positive shrink-0" />
                <span className="truncate">
                  Intent: <strong className="text-brand-orange">{intent}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card border border-surface-border/60">
                <Cpu className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                <span className="truncate">
                  Engine: <strong className="text-text-main">{modelName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card border border-surface-border/60">
                <ShieldCheck className="w-3.5 h-3.5 text-status-positive shrink-0" />
                <span className="truncate">
                  Guardrail:{" "}
                  <strong className={guardrailPassed ? "text-status-positive" : "text-status-warning"}>
                    {guardrailPassed ? "Verified (0 hallucinations)" : "Fallback triggered"}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-card border border-surface-border/60">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  Latency: <strong className="text-text-main">{completedDurationSec.toFixed(2)}s</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
